import { pyrope, redstone } from '@latticexyz/common/chains';
import { useComponentValue } from '@latticexyz/react';
import { getComponentValueStrict, HasValue, runQuery } from '@latticexyz/recs';
import { Analytics } from '@vercel/analytics/react';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { useAccount } from 'wagmi';

import { AsyncRevenueDialog } from '@/components/dialogs/AsyncRevenueDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { SolarFarmDialog } from '@/components/dialogs/SolarFarmDialog';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/ui/sonner';
import { useMUD } from '@/hooks/useMUD';
import { useSyncStatus } from '@/mud/useSyncStatus';
import AppRoutes from '@/Routes';
import { API_ENDPOINT, MAX_BATTLE_DURATION } from '@/utils/constants';
import { getGameChain, getWorldAddress } from '@/utils/helpers';

export const App = (): JSX.Element => {
  const {
    components: { Battle, Username },
    network: { globalPlayerId },
  } = useMUD();
  const { address: playerAddress } = useAccount();
  const { isLive } = useSyncStatus();
  const savedUsername = useComponentValue(Username, globalPlayerId)?.value;

  const hasRun = useRef(false);

  useEffect(() => {
    (async () => {
      if (!playerAddress) return;
      // This prevents the effect from running twice in StrictMode
      if (!isLive) return;
      if (hasRun.current) return;
      hasRun.current = true;

      let sessionAddress: `0x${string}` | undefined;
      // get session wallet address from 'mud:entrykit' in local storage
      const entrykit = localStorage.getItem('mud:entrykit');
      if (entrykit) {
        const parsedEntryKit = JSON.parse(entrykit);
        const sessionWalletsMapping = parsedEntryKit?.state?.signers;
        if (!sessionWalletsMapping) return;

        const sessionSignerPrivateKey = sessionWalletsMapping[
          playerAddress.toLowerCase() as `0x${string}`
        ] as `0x${string}` | undefined;
        if (!sessionSignerPrivateKey) return;

        const sessionSigner = privateKeyToAccount(sessionSignerPrivateKey);
        const sessionSignerWalletClient = createWalletClient({
          account: sessionSigner,
          chain: getGameChain(),
          transport: http(),
        });
        const sessionAccount = await toSimpleSmartAccount({
          client: sessionSignerWalletClient,
          owner: sessionSigner,
        });
        sessionAddress = sessionAccount.address;
      }
      if (!sessionAddress) return;
      const gameChain = getGameChain();

      const activeBattleIds = Array.from(
        runQuery([HasValue(Battle, { endTimestamp: BigInt(0) })]),
      ).map(entity => {
        const battle = getComponentValueStrict(Battle, entity);

        return {
          id: entity,
          startTimestamp: battle.startTimestamp,
        };
      });

      const staleBattleIds = activeBattleIds
        .filter(
          battle =>
            Date.now() / 1000 - Number(battle.startTimestamp) >
            MAX_BATTLE_DURATION,
        )
        .map(battle => battle.id);

      if (staleBattleIds.length > 0) {
        // End stale battles
        const worldAddress = getWorldAddress();
        const res = await fetch(`${API_ENDPOINT}/end-stale-battles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            battleIds: staleBattleIds,
            chainId: gameChain.id,
            worldAddress,
          }),
        });
        if (res.ok) {
          // eslint-disable-next-line no-console
          console.info('Stale battles ended successfully');
        } else {
          // eslint-disable-next-line no-console
          console.error('Failed to end stale battles');
        }
      }

      if (gameChain.id === pyrope.id || gameChain.id === redstone.id) {
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
          const lowBalance = balance < parseEther('0.000004');
          if (lowBalance) {
            // eslint-disable-next-line no-console
            console.info('[Faucet]: Balance is low, dripping funds to player');

            const res = await fetch(`${API_ENDPOINT}/faucet`, {
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
    })();
  }, [Battle, isLive, playerAddress]);

  return (
    <Router>
      <Analytics />
      <AppRoutes />
      <Footer />
      <SettingsDialog />
      {savedUsername && <SolarFarmDialog />}
      <AsyncRevenueDialog />
      <Toaster />
    </Router>
  );
};

export default App;
