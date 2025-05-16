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
const { baseSepolia, pyrope } = require("viem/chains");
const BASE_ESCOW_ABI = require("./abi/baseEscrowAbi.json");
const SELL_EMITTER_ABI = require("./abi/sellEmitterAbi.json");

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
  const { amount, buyer, nonce, txHash } = req.body;

  if (!(amount && buyer && nonce && txHash)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const basePublicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    const receipt = await basePublicClient.getTransactionReceipt({
      hash: txHash,
    });

    const { ESCROW_ADDRESS } = process.env;
    if (!ESCROW_ADDRESS) {
      return res.status(500).json({ error: "ESCROW_ADDRESS not set" });
    }

    const eventLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === ESCROW_ADDRESS.toLowerCase()
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
      chain: pyrope,
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
  const { amount, nonce, seller, txHash } = req.body;

  if (!(amount && nonce && seller && txHash)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const basePublicClient = createPublicClient({
      chain: pyrope,
      transport: http(),
    });

    const receipt = await basePublicClient.getTransactionReceipt({
      hash: txHash,
    });

    const { SELL_EMITTER_ADDRESS } = process.env;
    if (!SELL_EMITTER_ADDRESS) {
      return res.status(500).json({ error: "SELL_EMITTER_ADDRESS not set" });
    }

    const eventLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === SELL_EMITTER_ADDRESS.toLowerCase()
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
      chain: baseSepolia,
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
