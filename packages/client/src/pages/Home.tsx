import { AccountButton, useSessionClient } from '@latticexyz/entrykit/internal';
import { useComponentValue } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
} from '@latticexyz/recs';
import { encodeEntity, singletonEntity } from '@latticexyz/store-sync/recs';
import { Battery, Loader2, Play, Signal, Zap } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { MaxPlayersDialog } from '@/components/dialogs/MaxPlayersDialog';
import { HomeTabs } from '@/components/HomeTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/SettingsContext';
import { useSolarFarm } from '@/contexts/SolarFarmContext';
import { useMUD } from '@/hooks/useMUD';
import { BATTLES_PATH } from '@/Routes';
import { BATTERY_STORAGE_LIMIT, MAX_PLAYERS } from '@/utils/constants';
import { formatWattHours, getBatteryColor } from '@/utils/helpers';

export const Home = (): JSX.Element => {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const { data: sessionClient } = useSessionClient();
  const {
    components: {
      AddressToPlayerId,
      BatteryDetails,
      Battle,
      CurrentBattle,
      KingdomsByLevel,
      PlayerCount,
      SavedKingdom,
      SolarFarmDetails,
      TopLevel,
      Username,
      WinStreak,
    },
    network: { globalPlayerId },
    systemCalls: { claimRecharge, createBattle },
  } = useMUD();
  const { playSfx } = useSettings();
  const { setIsSolarFarmDialogOpen } = useSolarFarm();

  const [username, setUsername] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);

  const [isMaxPlayersDialogOpen, setIsMaxPlayersDialogOpen] = useState(false);
  const [isClaimingRecharge, setIsClaimingRecharge] = useState(false);

  // Ensure home page title is always "Auto Tower Defense"
  useEffect(() => {
    document.title = `Auto Tower Defense`;
  }, []);

  const playerCount = Number(
    useComponentValue(PlayerCount, singletonEntity)?.value ?? 0,
  );

  const batteryDetails = useComponentValue(BatteryDetails, globalPlayerId);
  const solarFarmDetails = useComponentValue(SolarFarmDetails, singletonEntity);

  const batteryCharge = useMemo(() => {
    if (!batteryDetails) return 0;
    const { activeBalance } = batteryDetails;
    const percentOfStorage =
      (Number(activeBalance) / BATTERY_STORAGE_LIMIT) * 100;
    return Math.round(percentOfStorage);
  }, [batteryDetails]);

  const claimableRecharge = useMemo(() => {
    if (!(batteryDetails && solarFarmDetails)) return BigInt(0);
    const { lastRechargeTimestamp } = batteryDetails;
    const currentTime = Date.now();
    const timeSinceLastRecharge =
      currentTime - Number(lastRechargeTimestamp) * 1000;
    return BigInt(
      Math.floor(timeSinceLastRecharge / Number(solarFarmDetails.msPerWh)),
    );
  }, [batteryDetails, solarFarmDetails]);

  const onCreateBattle = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        setIsCreatingBattle(true);
        playSfx('click1');

        if (!address) {
          throw new Error('No wallet address connected');
        }

        if (!globalPlayerId) {
          const { error, success } = await createBattle(username, true);
          if (error && !success) {
            throw new Error(error);
          }

          toast.success('Battle Created!');
          const newGlobalPlayerId = getComponentValue(
            AddressToPlayerId,
            encodeEntity(
              {
                address: 'address',
              },
              {
                address,
              },
            ),
          )?.value as Entity | undefined;

          if (!newGlobalPlayerId) {
            throw new Error('No player ID found for the connected address');
          }
          const currentBattle = getComponentValue(
            CurrentBattle,
            newGlobalPlayerId,
          )?.value;

          if (!currentBattle) {
            throw new Error('No recent battle found');
          }

          navigate(`${BATTLES_PATH}/${currentBattle}`);
          return;
        }

        let currentBattle = getComponentValue(
          CurrentBattle,
          globalPlayerId,
        )?.value;
        if (currentBattle) {
          const battle = getComponentValueStrict(
            Battle,
            currentBattle as Entity,
          );
          if (battle.endTimestamp === BigInt(0)) {
            navigate(`${BATTLES_PATH}/${currentBattle}`);
            return;
          }
        }

        const savedUsername = getComponentValue(
          Username,
          globalPlayerId,
        )?.value;
        if (playerCount >= MAX_PLAYERS && !savedUsername) {
          setIsMaxPlayersDialogOpen(true);
          return;
        }

        const winStreak =
          getComponentValue(WinStreak, globalPlayerId)?.value ?? BigInt(0);
        const topLevel =
          getComponentValue(TopLevel, singletonEntity)?.level ?? BigInt(0);

        const levelAsEntity = encodeEntity(
          { level: 'uint256' },
          { level: topLevel ?? 0n },
        );

        const topLevelKingdoms =
          getComponentValue(KingdomsByLevel, levelAsEntity)?.savedKingdomIds ??
          [];

        const topLevelKingdomsICanPlay = topLevelKingdoms.filter(
          savedKingdomId => {
            const savedTopLevelKingdom = getComponentValueStrict(
              SavedKingdom,
              savedKingdomId as Entity,
            );
            return savedTopLevelKingdom.author !== globalPlayerId;
          },
        );

        const resetLevel =
          winStreak === 0n ||
          winStreak > (topLevel ?? 0n) ||
          (topLevel >= winStreak && topLevelKingdomsICanPlay.length === 0);

        const activeBalance = batteryDetails?.activeBalance ?? BigInt(0);
        const reserveBalance = batteryDetails?.reserveBalance ?? BigInt(0);
        const totalBalance = activeBalance + reserveBalance;
        if (totalBalance < BigInt(8000) && !!savedUsername && resetLevel) {
          setIsSolarFarmDialogOpen(true);
          return;
        }

        const { error, success } = await createBattle(username, resetLevel);
        if (error && !success) {
          throw new Error(error);
        }

        toast.success('Battle Created!');
        currentBattle = getComponentValue(CurrentBattle, globalPlayerId)?.value;
        if (!currentBattle) {
          throw new Error('No recent battle found');
        }

        navigate(`${BATTLES_PATH}/${currentBattle}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        toast.error('Error Creating Battle', {
          description: (error as Error).message,
        });
      } finally {
        setIsCreatingBattle(false);
      }
    },
    [
      address,
      AddressToPlayerId,
      batteryDetails,
      Battle,
      createBattle,
      CurrentBattle,
      KingdomsByLevel,
      navigate,
      globalPlayerId,
      playSfx,
      playerCount,
      SavedKingdom,
      setIsSolarFarmDialogOpen,
      TopLevel,
      Username,
      username,
      WinStreak,
    ],
  );

  const onClaimRecharge = useCallback(async () => {
    try {
      setIsClaimingRecharge(true);
      playSfx('click2');

      const { error, success } = await claimRecharge();

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Recharge Claimed!');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Claiming Recharge', {
        description: (error as Error).message,
      });
    } finally {
      setIsClaimingRecharge(false);
    }
  }, [claimRecharge, playSfx]);

  useEffect(() => {
    if (!globalPlayerId) return;
    const savedUsername = getComponentValue(Username, globalPlayerId)?.value;
    if (savedUsername) {
      setUsername(savedUsername);
      setUsernameSaved(true);
    }
  }, [Username, globalPlayerId]);

  const usernameError = useMemo(() => {
    if (!username) return null;
    if (username.length > 20) {
      return 'Username must be 20 characters or less';
    }
    return null;
  }, [username]);

  return (
    <div className="bg-black flex flex-col min-h-screen p-4 relative text-white">
      <BackgroundAnimation />
      {/* Claim Recharge Button */}
      {claimableRecharge > BigInt(1_000) &&
        batteryDetails &&
        (batteryDetails.activeBalance ?? BigInt(0)) < BATTERY_STORAGE_LIMIT && (
          <Button
            className="bg-green-800/80 border border-green-600/50 fixed hover:bg-green-700/90 left-1/2 mt-2 shadow-green-900/20 shadow-md text-green-100 text-xs top-4"
            disabled={isClaimingRecharge}
            onClick={onClaimRecharge}
            size="sm"
            style={{
              transform: 'translateX(-50%)',
            }}
          >
            {isClaimingRecharge && <Loader2 className="animate-spin h-6 w-6" />}
            Claim Recharge (+
            {formatWattHours(
              claimableRecharge + batteryDetails.activeBalance > BigInt(24000)
                ? BigInt(BATTERY_STORAGE_LIMIT) - batteryDetails.activeBalance
                : claimableRecharge,
            )}
            )
          </Button>
        )}

      <h1 className="bg-clip-text bg-gradient-to-r font-bold from-purple-400 mb-6 mt-20 text-center text-transparent text-4xl to-pink-400 via-cyan-400">
        AUTO TOWER DEFENSE
      </h1>

      {/* Player Count Display */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-900/60 border border-cyan-900/30 flex gap-2 items-center px-4 py-2 rounded-full">
          <Signal className="h-4 text-cyan-400 w-4" />
          <span className="text-gray-300 text-sm">
            <span className="font-medium text-cyan-400">{playerCount}</span>
            <span className="mx-1">/</span>
            <span className="text-gray-400">{MAX_PLAYERS}</span>
            <span className="ml-1">players</span>
          </span>
        </div>
      </div>

      {!isConnected && (
        <div className="mb-4 neon-text-cyan text-center text-xl">
          Connect your wallet to play!
        </div>
      )}

      {!sessionClient && isConnected && (
        <div className="mb-4 neon-text-cyan text-center text-xl">
          Complete session setup to play!
        </div>
      )}

      <div
        className={`flex justify-center ${!isConnected || !sessionClient ? 'mb-20' : 'mb-8'}`}
      >
        <AccountButton />
      </div>

      {!!sessionClient && (
        <>
          {usernameSaved && (
            <div className="mb-8 neon-text-cyan text-center text-xl">
              Welcome back, {username}!
            </div>
          )}

          {/* Battery Information */}
          {batteryDetails && (
            <div className="flex justify-center mb-8">
              <div className="bg-gray-900/60 border border-gray-800 flex gap-2 py-2 items-center rounded-full sm:gap-4 px-3 sm:px-4">
                {/* Battery Charge */}
                <div className="flex gap-1 sm:gap-2 sm:items-center">
                  <Battery
                    className={`h-3 sm:h-4 sm:w-4 mt-1 self-start sm:mt-0 sm:self-auto w-3 ${getBatteryColor(batteryCharge)}`}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span
                      className={`font-medium sm:text-sm text-xs ${getBatteryColor(batteryCharge)}`}
                    >
                      {formatWattHours(batteryDetails.activeBalance)} (
                      {batteryCharge}%)
                    </span>
                    <span className="sm:ml-1 text-gray-400 text-xs">
                      Battery
                    </span>
                  </div>
                </div>
                <div className="bg-gray-700 h-8 w-px"></div>
                {/* Power Reserve */}
                <div className="flex gap-1 sm:gap-2 sm:items-center">
                  <Zap className="h-3 mt-1 self-start sm:h-4 sm:mt-0 sm:self-auto sm:w-4 text-yellow-400 w-3" />
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span className="font-medium sm:text-sm text-xs text-yellow-400">
                      {formatWattHours(batteryDetails.reserveBalance)}
                    </span>
                    <span className="sm:ml-1 text-gray-400 text-xs">
                      Reserve
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-md mb-8 mx-auto w-full">
            <form className="space-y-6" onSubmit={onCreateBattle}>
              {!usernameSaved && (
                <div className="space-y-2">
                  <Label className="text-lg text-cyan-300" htmlFor="username">
                    Username
                  </Label>
                  <Input
                    className="bg-transparent border-cyan-800 focus:border-cyan-100 text-cyan-100"
                    disabled={isCreatingBattle}
                    id="username"
                    onChange={e => setUsername(e.target.value)}
                    placeholder="ROB"
                    required
                    type="text"
                    value={username}
                  />
                  {usernameError && (
                    <div className="text-red-500 text-sm ">{usernameError}</div>
                  )}
                </div>
              )}
              <div className="flex justify-center mb-16">
                <Button
                  aria-label="Submit username and play"
                  className="active:bg-cyan-900 active:scale-95 bg-cyan-900/20 border-cyan-500 duration-200 focus:bg-cyan-900/30 focus:text-cyan-300 h-16 rounded-full text-cyan-400 w-16 hover:bg-cyan-900/50 hover:border-cyan-400 hover:text-cyan-300 neon-border transition-all"
                  disabled={isCreatingBattle}
                  size="icon"
                  type="submit"
                  variant="outline"
                >
                  {isCreatingBattle ? (
                    <Loader2 className="animate-spin h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="mb-20 z-1">
        <HomeTabs />
      </div>

      <div className="flex justify-center mb-4 mt-8">
        <a
          className="fill-gray-500 gap-2 hover:fill-gray-400 hover:text-gray-400 inline-flex items-center text-gray-500 text-xs transition-colors"
          href="https://github.com/ECWireless/auto-tower-defense"
          rel="noopener noreferrer"
          target="_blank"
        >
          <div className="flex-shrink-0 h-4 w-4">
            <svg
              role="img"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>GitHub</title>
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </div>
          View source on GitHub
        </a>
      </div>

      <MaxPlayersDialog
        isMaxPlayersDialogOpen={isMaxPlayersDialogOpen}
        setIsMaxPlayersDialogOpen={setIsMaxPlayersDialogOpen}
      />
    </div>
  );
};
