import { garnet, redstone, rhodolite } from '@latticexyz/common/chains';
import { createWagmiConfig } from '@latticexyz/entrykit/internal';
import { http, webSocket } from 'viem';
import { anvil } from 'viem/chains';

import { chainId, chains } from '@/common';

export const transports = {
  [anvil.id]: webSocket(),
  [garnet.id]: http(),
  [rhodolite.id]: http(),
  [redstone.id]: http(),
} as const;

export const wagmiConfig = createWagmiConfig({
  appName: document.title,
  chainId,
  chains,
  pollingInterval: {
    [anvil.id]: 2000,
    [garnet.id]: 2000,
    [rhodolite.id]: 2000,
    [redstone.id]: 2000,
  },
  transports,
  walletConnectProjectId: '5fba40655939be0d70dc90e289645956',
});
