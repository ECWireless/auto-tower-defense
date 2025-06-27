import { defineConfig, EntryKitProvider } from '@latticexyz/entrykit/internal';
import { SyncProvider } from '@latticexyz/store-sync/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';

import { SettingsProvider } from '@/contexts/SettingsContext';
import { SolarFarmProvider } from '@/contexts/SolarFarmContext';
import { syncAdapter } from '@/mud/recs';
import { CHAIN_ID, START_BLOCK } from '@/utils/constants';
import { getWorldAddress } from '@/utils/helpers';
import { wagmiConfig } from '@/wagmiConfig';

const queryClient = new QueryClient();

export type ProvidersProps = {
  children: ReactNode;
};

export const Providers = ({ children }: ProvidersProps): JSX.Element => {
  const worldAddress = getWorldAddress();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <EntryKitProvider
          config={defineConfig({ chainId: CHAIN_ID, worldAddress })}
        >
          <SyncProvider
            adapter={syncAdapter}
            address={worldAddress}
            chainId={CHAIN_ID}
            startBlock={START_BLOCK}
          >
            <SettingsProvider>
              <SolarFarmProvider>{children}</SolarFarmProvider>
            </SettingsProvider>
          </SyncProvider>
        </EntryKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
