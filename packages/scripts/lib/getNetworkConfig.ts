import { MUDChain } from "@latticexyz/common/chains";
import { mudFoundry } from "@latticexyz/common/chains";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WORLD_ADDRESS = process.env.WORLD_ADDRESS;
const INITIAL_BLOCK_NUMBER = process.env.INITIAL_BLOCK_NUMBER;

if (!PRIVATE_KEY) {
  throw new Error(`Invalid/Missing environment variable: "PRIVATE_KEY"`);
}

if (!WORLD_ADDRESS) {
  throw new Error(`Invalid/Missing environment variable: "WORLD_ADDRESS"`);
}

if (!INITIAL_BLOCK_NUMBER) {
  throw new Error(
    `Invalid/Missing environment variable: "INITIAL_BLOCK_NUMBER"`
  );
}

const SUPPORTED_CHAINS = [mudFoundry];

export async function getNetworkConfig(): Promise<{
  privateKey: `0x${string}`;
  chainId: number;
  chain: MUDChain;
  worldAddress: string;
  initialBlockNumber: number | bigint;
}> {
  const chainId = Number(mudFoundry.id);

  const chainIndex = SUPPORTED_CHAINS.findIndex((c) => c.id === chainId);
  const chain = SUPPORTED_CHAINS[chainIndex];
  if (!chain) {
    throw new Error(`Chain ${chainId} not found`);
  }

  return {
    privateKey: PRIVATE_KEY as `0x${string}`,
    chainId,
    chain,
    worldAddress: WORLD_ADDRESS as string,
    initialBlockNumber: BigInt(INITIAL_BLOCK_NUMBER as string),
  };
}
