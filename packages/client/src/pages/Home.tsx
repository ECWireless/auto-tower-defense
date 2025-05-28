import { AccountButton, useSessionClient } from '@latticexyz/entrykit/internal';
import { useComponentValue } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
} from '@latticexyz/recs';
import {
  decodeEntity,
  encodeEntity,
  singletonEntity,
} from '@latticexyz/store-sync/recs';
import { Battery, Loader2, Play, Signal, Zap } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { HomeTabs } from '@/components/HomeTabs';
import { MaxPlayersDialog } from '@/components/MaxPlayersDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/SettingsContext';
import { useSolarFarm } from '@/contexts/SolarFarmContext';
import { useMUD } from '@/hooks/useMUD';
import { GAMES_PATH } from '@/Routes';
import { BATTERY_STORAGE_LIMIT, MAX_PLAYERS } from '@/utils/constants';
import { formatWattHours, getBatteryColor } from '@/utils/helpers';

export const Home = (): JSX.Element => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { data: sessionClient } = useSessionClient();
  const {
    components: {
      BatteryDetails,
      CurrentGame,
      Game,
      KingdomsByLevel,
      PlayerCount,
      SavedKingdom,
      SolarFarmDetails,
      TopLevel,
      Username,
      WinStreak,
    },
    network: { playerEntity },
    systemCalls: { claimRecharge, createGame },
  } = useMUD();
  const { playSfx } = useSettings();
  const { setIsSolarFarmDialogOpen } = useSolarFarm();

  const [username, setUsername] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const [isMaxPlayersDialogOpen, setIsMaxPlayersDialogOpen] = useState(false);
  const [isClaimingRecharge, setIsClaimingRecharge] = useState(false);

  // Ensure home page title is always "Auto Tower Defense"
  useEffect(() => {
    document.title = `Auto Tower Defense`;
  }, []);

  const playerCount = Number(
    useComponentValue(PlayerCount, singletonEntity)?.value ?? 0,
  );

  const batteryDetails = useComponentValue(BatteryDetails, playerEntity);
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

  const onCreateGame = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        setIsCreatingGame(true);
        playSfx('click1');

        if (!playerEntity) {
          throw new Error('Player entity not found');
        }

        let currentGame = getComponentValue(CurrentGame, playerEntity)?.value;
        if (currentGame) {
          const game = getComponentValueStrict(Game, currentGame as Entity);
          if (game.endTimestamp === BigInt(0)) {
            navigate(`${GAMES_PATH}/${currentGame}`);
            return;
          }
        }

        const savedUsername = getComponentValue(Username, playerEntity)?.value;
        if (playerCount >= MAX_PLAYERS && !savedUsername) {
          setIsMaxPlayersDialogOpen(true);
          return;
        }

        const winStreak =
          getComponentValue(WinStreak, playerEntity)?.value ?? BigInt(0);
        const topLevel =
          getComponentValue(TopLevel, singletonEntity)?.level ?? BigInt(0);

        const levelAsEntity = encodeEntity(
          { level: 'uint256' },
          { level: topLevel ?? 0n },
        );

        const topLevelKingdoms =
          getComponentValue(KingdomsByLevel, levelAsEntity)?.savedKingdomIds ??
          [];

        const playerAddress = decodeEntity(
          {
            address: 'address',
          },
          playerEntity,
        ).address;

        const topLevelKingdomsICanPlay = topLevelKingdoms.filter(
          savedKingdomId => {
            const savedTopLevelKingdom = getComponentValueStrict(
              SavedKingdom,
              savedKingdomId as Entity,
            );
            return savedTopLevelKingdom.author !== playerAddress;
          },
        );

        const resetLevel =
          winStreak === 0n ||
          (topLevel === winStreak && topLevelKingdomsICanPlay.length === 0);

        const activeBalance = batteryDetails?.activeBalance ?? BigInt(0);
        const reserveBalance = batteryDetails?.reserveBalance ?? BigInt(0);
        const totalBalance = activeBalance + reserveBalance;
        if (totalBalance < BigInt(8000) && !!savedUsername && resetLevel) {
          setIsSolarFarmDialogOpen(true);
          return;
        }

        const { error, success } = await createGame(username, resetLevel);

        if (error && !success) {
          throw new Error(error);
        }

        toast.success('Game Created!');

        currentGame = getComponentValue(CurrentGame, playerEntity)?.value;

        if (!currentGame) {
          throw new Error('No recent game found');
        }

        navigate(`${GAMES_PATH}/${currentGame}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        toast.error('Error Creating Game', {
          description: (error as Error).message,
        });
      } finally {
        setIsCreatingGame(false);
      }
    },
    [
      batteryDetails,
      createGame,
      CurrentGame,
      Game,
      KingdomsByLevel,
      navigate,
      playerEntity,
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
    if (!playerEntity) return;
    const savedUsername = getComponentValue(Username, playerEntity)?.value;
    if (savedUsername) {
      setUsername(savedUsername);
      setUsernameSaved(true);
    }
  }, [Username, playerEntity]);

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
        (batteryDetails?.activeBalance ?? BigInt(0)) <
          BATTERY_STORAGE_LIMIT && (
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
            Claim Recharge (+{formatWattHours(claimableRecharge)})
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
            <form className="space-y-6" onSubmit={onCreateGame}>
              {!usernameSaved && (
                <div className="space-y-2">
                  <Label className="text-lg text-cyan-300" htmlFor="username">
                    Username
                  </Label>
                  <Input
                    className="bg-transparent border-cyan-800 focus:border-cyan-100 text-cyan-100"
                    disabled={isCreatingGame}
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
                  disabled={isCreatingGame}
                  size="icon"
                  type="submit"
                  variant="outline"
                >
                  {isCreatingGame ? (
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

      <MaxPlayersDialog
        isMaxPlayersDialogOpen={isMaxPlayersDialogOpen}
        setIsMaxPlayersDialogOpen={setIsMaxPlayersDialogOpen}
      />
    </div>
  );
};
