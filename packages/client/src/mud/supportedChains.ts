/*
 * The supported chains.
 * By default, there are only two chains here:
 *
 * - mudFoundry, the chain running on anvil that pnpm dev
 *   starts by default. It is similar to the viem anvil chain
 *   (see https://viem.sh/docs/clients/test.html), but with the
 *   basefee set to zero to avoid transaction fees.
 * - Redstone, our production blockchain (https://redstone.xyz/)
 * - Garnet, our test blockchain (https://garnetchain.com/))
 *
 */

import {
  garnet,
  MUDChain,
  mudFoundry,
  redstone,
} from '@latticexyz/common/chains';
import { Chain } from 'viem';
import { chainConfig } from 'viem/op-stack';

const sourceId = 11155111;

const defaultRpcUrls = {
  http: ['https://rpc.pyropechain.com'],
  webSocket: ['wss://rpc.pyropechain.com'],
} as const satisfies Chain['rpcUrls']['default'];

export const pyrope = {
  ...chainConfig,
  name: 'Pyrope Testnet',
  testnet: true,
  id: 695569,
  sourceId,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: defaultRpcUrls,
    bundler: defaultRpcUrls,
    quarryPassIssuer: defaultRpcUrls,
    wiresaw: defaultRpcUrls,
  },
  contracts: {
    ...chainConfig.contracts,
    l1StandardBridge: {
      [sourceId]: {
        address: '0xC24932c31D9621aE9e792576152B7ef010cFC2F8',
      },
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer.pyropechain.com',
    },
    worldsExplorer: {
      name: 'MUD Worlds Explorer',
      url: 'https://explorer.mud.dev/pyrope/worlds',
    },
  },
  iconUrls: ['https://lattice.xyz/brand/color/pyrope.svg'],
  indexerUrl: 'https://indexer.mud.pyropechain.com',
} as const satisfies MUDChain;

/*
 * See https://mud.dev/guides/hello-world/add-chain-client
 * for instructions on how to add networks.
 */
export const supportedChains: MUDChain[] = [
  mudFoundry,
  redstone,
  garnet,
  pyrope,
];
