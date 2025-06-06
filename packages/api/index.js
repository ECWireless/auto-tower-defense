require("dotenv").config();
const express = require("express");
const { compile } = require("solc");
const cors = require("cors");
const {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeAbiParameters,
  http,
  keccak256,
  toHex,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { base, baseSepolia, pyrope, redstone } = require("viem/chains");
const BASE_ESCOW_ABI = require("./abi/baseEscrowAbi.json");
const SELL_EMITTER_ABI = require("./abi/sellEmitterAbi.json");

const SUPPORTED_CHAINS = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
  [pyrope.id]: pyrope,
  [redstone.id]: redstone,
};

const ESCROW_CONTRACTS = {
  [base.id]: "0x977437F82fb629FBF3028d485144Ad5666228133",
  [baseSepolia.id]: "0x1ee0C3C8A365fC31eF1eAfAf83bA628940a9498a",
};

const SELL_EMITTER_CONTRACTS = {
  [pyrope.id]: "0x0AB13388351C49919C5a6E747De868ad9D8B7437",
  [redstone.id]: "",
};

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3002;

app.get("/", (_, res) => {
  res.send("Auto Defense API");
});

app.post("/compile", (req, res) => {
  try {
    const { sourceCode } = req.body;

    const fileName = "LogicSystem.sol";

    const input = {
      language: "Solidity",
      sources: {
        [fileName]: {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["*"],
          },
        },
      },
    };

    const output = JSON.parse(compile(JSON.stringify(input)));
    const contractName = Object.keys(output.contracts[fileName])[0];
    const bytecode =
      output.contracts[fileName][contractName].evm.bytecode.object;

    if (!bytecode) {
      res.status(500).send("Error compiling contract");
    }

    res.send(bytecode);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error compiling contract");
  }
});

app.post("/buy-validator-signature", async (req, res) => {
  const { amount, buyer, destinationChainId, nonce, originChainId, txHash } =
    req.body;

  if (
    !(amount && buyer && destinationChainId && nonce && originChainId && txHash)
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const originChain = SUPPORTED_CHAINS[originChainId];
  const destinationChain = SUPPORTED_CHAINS[destinationChainId];
  const escrowAddress = ESCROW_CONTRACTS[originChainId];

  if (!SUPPORTED_CHAINS[originChainId]) {
    return res.status(400).json({ error: "Unsupported origin chain ID" });
  }

  if (!SUPPORTED_CHAINS[destinationChainId]) {
    return res.status(400).json({ error: "Unsupported destination chain ID" });
  }

  if (!escrowAddress) {
    return res.status(400).json({ error: "Escrow contract not deployed" });
  }

  try {
    const publicClient = createPublicClient({
      chain: originChain,
      transport: http(),
    });

    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });

    const eventLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === escrowAddress.toLowerCase()
    );

    if (!eventLog) {
      return res
        .status(404)
        .json({ error: "No ElectricityPurchase event found" });
    }

    const parsedLog = decodeEventLog({
      abi: BASE_ESCOW_ABI,
      data: eventLog.data,
      topics: eventLog.topics,
    });

    if (
      parsedLog.eventName !== "ElectricityPurchase" ||
      parsedLog.args.buyer.toLowerCase() !== buyer.toLowerCase() ||
      parsedLog.args.amount !== BigInt(amount) ||
      parsedLog.args.nonce !== BigInt(nonce)
    ) {
      return res.status(400).json({ error: "Event mismatch" });
    }

    const encodedData = encodeAbiParameters(
      [
        { type: "address", name: "buyer" },
        { type: "uint256", name: "amount" },
        { type: "uint256", name: "nonce" },
      ],
      [buyer, amount, nonce]
    );
    const structHash = keccak256(encodedData);

    const { VALIDATOR_PRIVATE_KEY } = process.env;
    if (!VALIDATOR_PRIVATE_KEY) {
      return res.status(500).json({ error: "VALIDATOR_PRIVATE_KEY not set" });
    }
    const validatorAccount = privateKeyToAccount(VALIDATOR_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account: validatorAccount,
      chain: destinationChain,
      transport: http(),
    });
    const signature = await walletClient.signMessage({
      message: { raw: structHash },
    });
    res.json({ signature });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signature failed" });
  }
});

app.post("/sell-validator-signature", async (req, res) => {
  const { amount, destinationChainId, nonce, originChainId, seller, txHash } =
    req.body;

  if (
    !(
      amount &&
      destinationChainId &&
      nonce &&
      originChainId &&
      seller &&
      txHash
    )
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const originChain = SUPPORTED_CHAINS[originChainId];
  const destinationChain = SUPPORTED_CHAINS[destinationChainId];
  const sellEmitterAddress = SELL_EMITTER_CONTRACTS[originChainId];

  if (!SUPPORTED_CHAINS[originChainId]) {
    return res.status(400).json({ error: "Unsupported origin chain ID" });
  }

  if (!SUPPORTED_CHAINS[destinationChainId]) {
    return res.status(400).json({ error: "Unsupported destination chain ID" });
  }

  if (!sellEmitterAddress) {
    return res
      .status(400)
      .json({ error: "Sell emitter contract not deployed" });
  }

  try {
    const publicClient = createPublicClient({
      chain: originChain,
      transport: http(),
    });

    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });

    const eventLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === sellEmitterAddress.toLowerCase()
    );

    if (!eventLog) {
      return res.status(404).json({ error: "No ElectricitySold event found" });
    }

    const parsedLog = decodeEventLog({
      abi: SELL_EMITTER_ABI,
      data: eventLog.data,
      topics: eventLog.topics,
    });

    if (
      parsedLog.eventName !== "ElectricitySold" ||
      parsedLog.args.seller.toLowerCase() !== seller.toLowerCase() ||
      parsedLog.args.receiveAmount !== BigInt(amount) ||
      parsedLog.args.nonce !== BigInt(nonce)
    ) {
      return res.status(400).json({ error: "Event mismatch" });
    }

    const encodedData = encodeAbiParameters(
      [
        { type: "address", name: "seller" },
        { type: "uint256", name: "amount" },
        { type: "uint256", name: "nonce" },
      ],
      [seller, amount, nonce]
    );
    const structHash = keccak256(encodedData);

    const { VALIDATOR_PRIVATE_KEY } = process.env;
    if (!VALIDATOR_PRIVATE_KEY) {
      return res.status(500).json({ error: "VALIDATOR_PRIVATE_KEY not set" });
    }
    const validatorAccount = privateKeyToAccount(VALIDATOR_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account: validatorAccount,
      chain: destinationChain,
      transport: http(),
    });
    const signature = await walletClient.signMessage({
      message: { raw: structHash },
    });
    res.json({ signature });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signature failed" });
  }
});

app.listen(port, () => {
  console.log(`Auto Tower Defense API listening on port ${port}`);
});
