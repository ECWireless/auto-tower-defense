import { pyrope, redstone } from '@latticexyz/common/chains';
import { createWagmiConfig } from '@latticexyz/entrykit/internal';
import { http, webSocket } from 'viem';
import { anvil, base, baseSepolia } from 'viem/chains';

import { CHAIN_ID, SUPPORTED_CHAINS } from '@/utils/constants';

export const transports = {
  [anvil.id]: webSocket(),
  [base.id]: http(),
  [baseSepolia.id]: http(),
  [pyrope.id]: webSocket(),
  [redstone.id]: webSocket(),
} as const;

export const wagmiConfig = createWagmiConfig({
  appName: document.title,
  chainId: CHAIN_ID,
  chains: SUPPORTED_CHAINS,
  pollingInterval: {
    [anvil.id]: 2000,
    [base.id]: 2000,
    [baseSepolia.id]: 2000,
    [pyrope.id]: 2000,
    [redstone.id]: 2000,
  },
  transports,
  walletConnectProjectId: '5fba40655939be0d70dc90e289645956',
});
