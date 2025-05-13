import { garnet, pyrope, redstone, rhodolite } from '@latticexyz/common/chains';
import { Chain, Hex } from 'viem';
import { anvil, baseSepolia } from 'viem/chains';

export const BATTERY_STORAGE_LIMIT = 24000; // Watt-hours
export const MAX_PLAYERS = 100;
export const MAX_ROUNDS = 10;
export const MAX_TICKS = 28;

export const CHAIN_ID = import.meta.env.CHAIN_ID;
export const WORLD_ADDRESS = import.meta.env.WORLD_ADDRESS;
export const START_BLOCK = BigInt(import.meta.env.START_BLOCK ?? 0n);
export const BASE_USDC_ADDRESS = import.meta.env.VITE_BASE_USDC_ADDRESS;

export const url = new URL(window.location.href);
export type Entity = Hex;

export const chains: readonly [Chain, ...Chain[]] = [
  baseSepolia,
  garnet,
  pyrope,
  redstone,
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
