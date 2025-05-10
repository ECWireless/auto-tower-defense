import { Chain, Hex } from 'viem';

import { chains } from '@/wagmiConfig';

export const chainId = import.meta.env.CHAIN_ID;
export const worldAddress = import.meta.env.WORLD_ADDRESS;
export const startBlock = BigInt(import.meta.env.START_BLOCK ?? 0n);

export const url = new URL(window.location.href);

export type Entity = Hex;

export const getWorldAddress = (): `0x${string}` => {
  if (!worldAddress) {
    throw new Error(
      'No world address configured. Is the world still deploying?',
    );
  }
  return worldAddress;
};

export const getChain = (): Chain => {
  const chain = chains.find(c => c.id === chainId);
  if (!chain) {
    throw new Error(`No chain configured for chain ID ${chainId}.`);
  }
  return chain;
};
