import { AccountButton, useSessionClient } from '@latticexyz/entrykit/internal';
import { useComponentValue } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
} from '@latticexyz/recs';
import { encodeEntity, singletonEntity } from '@latticexyz/store-sync/recs';
import { Battery, Castle, Loader2, Play, Zap } from 'lucide-react';
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
import {
  API_ENDPOINT,
  BATTERY_STORAGE_LIMIT,
  MAX_PLAYERS,
} from '@/utils/constants';
import { formatWattHours, getBatteryColor } from '@/utils/helpers';

const BattleButtonContent = ({
  isCreatingBattle,
}: {
  isCreatingBattle: boolean;
}) => (
  <div className="flex items-center justify-center">
    {isCreatingBattle ? (
      <>
        <Loader2 className="animate-spin h-8 w-8 mr-2" />
        <span className="text-xl uppercase">Joining battle</span>
      </>
    ) : (
      <>
        <Play className="h-10 w-10 mr-2" />
        <span className="text-xl uppercase font-semibold">Join battle</span>
      </>
    )}
  </div>
);

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
    let timeSinceLastRecharge =
      currentTime - Number(lastRechargeTimestamp) * 1000;
    const timeSinceRechargeUnpaused =
      currentTime - Number(solarFarmDetails.unpausedTimestamp) * 1000;
    if (timeSinceLastRecharge > timeSinceRechargeUnpaused) {
      timeSinceLastRecharge = timeSinceRechargeUnpaused;
    }

    const baseClaimable = BigInt(
      Math.floor(timeSinceLastRecharge / Number(solarFarmDetails.msPerWh)),
    );
    return baseClaimable + batteryDetails.activeBalance > BigInt(24000)
      ? BigInt(BATTERY_STORAGE_LIMIT) - batteryDetails.activeBalance
      : baseClaimable;
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
          const res = await fetch(`${API_ENDPOINT}/check-username`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username.trim() }),
          });

          if (!res.ok) {
            throw new Error('Failed to validate username');
          }

          const { acceptable } = await res.json();
          if (!acceptable) {
            throw new Error('Username does not pass content moderation');
          }

          const { error, success } = await createBattle(username.trim(), true);
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

  const savedUsername = useComponentValue(Username, globalPlayerId)?.value;
  useEffect(() => {
    if (!globalPlayerId) return;
    if (savedUsername) {
      setUsername(savedUsername);
      setUsernameSaved(true);
    }
  }, [globalPlayerId, savedUsername]);

  const usernameError = useMemo(() => {
    if (!username) return null;
    if (username.length > 20) {
      return 'Username must be 20 characters or less';
    }
    return null;
  }, [username]);

  // Shows total players who have played. Important for playtest cap (100 players) so users know if the limit is close.
  const PlayerCountDisplay = (
    <div className="flex flex-col items-center justify-center mb-8">
      <div className="bg-gray-900 border border-cyan-800 flex gap-2 items-center px-4 py-2 rounded-full -mb-4 z-10">
        <Castle className="h-4 text-cyan-400 w-4" />
        <span className="text-gray-300 text-sm">
          <span className="font-medium text-cyan-400">{playerCount}</span>
          <span className="mx-1">/</span>
          <span className="text-gray-400">{MAX_PLAYERS}</span>
          <span className="ml-1">playtesters {playerCount >= 100 && '🚨'}</span>
        </span>
      </div>
      <div className="mt-2 rounded-lg bg-cyan-900/60 px-4 py-3 text-xs lg:text-sm text-cyan-100 max-w-xs text-center border border-cyan-800">
        The playtest is limited to 100 players. If the cap is reached, new
        players can&apos;t join.
      </div>
    </div>
  );

  return (
    <div className="bg-black flex flex-col min-h-screen p-4 relative text-white">
      <BackgroundAnimation />
      {/* Claim Recharge Button */}
      {claimableRecharge > BigInt(1_000) &&
        solarFarmDetails &&
        !solarFarmDetails.rechargePaused &&
        batteryDetails &&
        (batteryDetails.activeBalance ?? BigInt(0)) < BATTERY_STORAGE_LIMIT && (
          <Button
            className="bg-green-800/80 border border-green-600/50 fixed hover:bg-green-700/90 left-1/2 shadow-green-900/20 shadow-md text-green-100 text-xs top-4"
            disabled={isClaimingRecharge}
            onClick={onClaimRecharge}
            size="sm"
            style={{
              transform: 'translateX(-50%)',
            }}
          >
            {isClaimingRecharge && <Loader2 className="animate-spin h-6 w-6" />}
            Claim Recharge (+
            {formatWattHours(claimableRecharge)})
          </Button>
        )}
      {solarFarmDetails && solarFarmDetails.rechargePaused && (
        <div
          className="bg-yellow-800/80 border border-yellow-600/50 fixed left-1/2 p-2 rounded-md text-xs top-4"
          style={{
            transform: 'translateX(-50%)',
          }}
        >
          <p className="font-bold text-yellow-100">
            Battery charging is currently paused
          </p>
        </div>
      )}

      <h4 className="mt-14 mx-auto w-fit bg-clip-text bg-gradient-to-r font-medium from-purple-400 text-center text-transparent text-xl lg:text-2xl to-pink-400 via-cyan-400">
        BUILD. BATTLE. EARN.
      </h4>
      <h1 className="text-4xl lg:text-5xl text-white text-center flex flex-col space-y-2 uppercase">
        AUTO TOWER DEFENSE
      </h1>
      <div className="flex justify-center mb-4 mt-2">
        <span className="bg-yellow-500/20 border border-yellow-400/50 py-1 rounded-full text-sm px-3 text-yellow-300">
          Early Alpha Playtest
        </span>
      </div>

      <p className="text-gray-300 text-center text-lg max-w-lg mx-auto mt-3 mb-6">
        A strategy game for both battlers and builders. Battle to become the top
        kingdom, or build and patent tower components to earn royalties. Whether
        you&apos;re a tactician or an engineer, there&apos;s a path to victory.
      </p>

      {PlayerCountDisplay}

      {!sessionClient && isConnected && (
        <div className="flex flex-col items-center mb-6">
          <div className="mb-4 neon-text-cyan text-center text-xl">
            Complete session setup to play!
          </div>
          <div className="flex justify-center w-fit rounded-md overflow-hidden">
            <AccountButton />
          </div>
        </div>
      )}

      {!isConnected && (
        <div
          className={`flex justify-center ${!isConnected || !sessionClient ? 'mb-20' : 'mb-8'}`}
        >
          <div className="flex flex-col items-center rounded-lg p-4 w-full max-w-lg bg-yellow-700/20 border border-yellow-600/50">
            <p className="text-yellow-50 text-center text-base mb-4">
              Sign in with your wallet to start playing. Your next battle
              awaits!
            </p>

            <div className="flex justify-center w-fit rounded-md overflow-hidden">
              <AccountButton />
            </div>
          </div>
        </div>
      )}

      {!!sessionClient && (
        <div className="flex flex-col items-center bg-cyan-900/20 border border-cyan-600/50 rounded-lg p-5 w-full max-w-lg mx-auto space-y-4 mb-12">
          <div className="flex flex-col items-center gap-4 justify-center sm:flex-row ">
            {usernameSaved && (
              <span className="neon-text-cyan text-lg" title="Your username">
                {username}
              </span>
            )}
            <AccountButton />
          </div>

          {/* Battery Information */}
          {batteryDetails && (
            <div className="flex justify-center">
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

          <div className="max-w-md mx-auto w-full">
            <form className="space-y-6" onSubmit={onCreateBattle}>
              {!usernameSaved && (
                <div className="space-y-2">
                  <Label className="text-lg text-cyan-300" htmlFor="username">
                    Add a username
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
              <div className="flex justify-center">
                <Button
                  aria-label="Join battle"
                  disabled={isCreatingBattle}
                  className="bg-gradient-to-r font-medium from-purple-400 text-center text-2xl to-pink-400 via-cyan-400 text-black rounded-full shadow-lg shadow-purple-900/20 py-6 px-8 hover:scale-105 transition-all duration-200"
                  type="submit"
                  size="lg"
                  variant="default"
                >
                  <BattleButtonContent isCreatingBattle={isCreatingBattle} />
                </Button>
              </div>
            </form>
          </div>
        </div>
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
