import { garnet, pyrope, redstone, rhodolite } from '@latticexyz/common/chains';
import { Chain, Hex } from 'viem';
import { anvil } from 'viem/chains';

export const chainId = import.meta.env.CHAIN_ID;
export const worldAddress = import.meta.env.WORLD_ADDRESS;
export const startBlock = BigInt(import.meta.env.START_BLOCK ?? 0n);

export const url = new URL(window.location.href);

export type Entity = Hex;

export const chains: readonly [Chain, ...Chain[]] = [
  redstone,
  garnet,
  pyrope,
  rhodolite,
  {
    ...anvil,
    contracts: {
      ...anvil.contracts,
      paymaster: {
        address: '0xf03E61E7421c43D9068Ca562882E98d1be0a6b6e',
      },
    },
    blockExplorers: {
      default: {} as never,
      worldsExplorer: {
        name: 'MUD Worlds Explorer',
        url: 'http://localhost:13690/anvil/worlds',
      },
    },
  },
] as const satisfies Chain[];

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
