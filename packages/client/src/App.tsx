import { pyrope, redstone } from '@latticexyz/common/chains';
import { useSessionClient } from '@latticexyz/entrykit/internal';
import { useComponentValue } from '@latticexyz/react';
import { Analytics } from '@vercel/analytics/react';
import { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { createPublicClient, http, parseEther } from 'viem';

import { AsyncRevenueDialog } from '@/components/dialogs/AsyncRevenueDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { SolarFarmDialog } from '@/components/dialogs/SolarFarmDialog';
import { Toaster } from '@/components/ui/sonner';
import { useMUD } from '@/hooks/useMUD';
import AppRoutes from '@/Routes';
import { API_ENDPOINT } from '@/utils/constants';
import { getGameChain } from '@/utils/helpers';

export const App = (): JSX.Element => {
  const {
    components: { Username },
    network: { globalPlayerId },
  } = useMUD();
  const { data: sessionClient } = useSessionClient();
  const savedUsername = useComponentValue(Username, globalPlayerId)?.value;

  useEffect(() => {
    if (!sessionClient) return;
    const gameChain = getGameChain();
    if (gameChain.id === pyrope.id || gameChain.id === redstone.id) {
      const sessionAddress = sessionClient.account.address;
      // eslint-disable-next-line no-console
      console.info('[Faucet]: Session address -> ', sessionAddress);

      const requestDrip = async () => {
        const publicClient = createPublicClient({
          batch: { multicall: false },
          chain: gameChain,
          transport: http(),
        });
        const balance = await publicClient.getBalance({
          address: sessionAddress,
        });
        // eslint-disable-next-line no-console
        console.info(`[Faucet]: Player balance -> ${balance}`);
        const lowBalance = balance < parseEther('0.00001');
        if (lowBalance) {
          // eslint-disable-next-line no-console
          console.info('[Faucet]: Balance is low, dripping funds to player');

          const res = await fetch(`${API_ENDPOINT}/api/faucet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: sessionAddress,
              chainId: gameChain.id,
            }),
          });
          if (res.ok) {
            // eslint-disable-next-line no-console
            console.info('[Faucet]: Drip successful');
          } else {
            // eslint-disable-next-line no-console
            console.error('[Faucet]: Drip failed');
          }
        }
      };

      requestDrip();
      // Request a drip every 20 seconds
      setInterval(requestDrip, 20000);
    }
  }, [sessionClient, globalPlayerId]);

  return (
    <Router>
      <Analytics />
      <AppRoutes />
      <SettingsDialog />
      {savedUsername && <SolarFarmDialog />}
      <AsyncRevenueDialog />
      <Toaster />
    </Router>
  );
};

export default App;
