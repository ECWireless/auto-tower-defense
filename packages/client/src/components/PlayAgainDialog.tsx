import { useComponentValue, useEntityQuery } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
  HasValue,
} from '@latticexyz/recs';
import { encodeEntity, singletonEntity } from '@latticexyz/store-sync/recs';
import { AlertTriangle, Loader2, Play, Trophy } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { GiCannon } from 'react-icons/gi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { zeroHash } from 'viem';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBattle } from '@/contexts/BattleContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useSolarFarm } from '@/contexts/SolarFarmContext';
import { useMUD } from '@/hooks/useMUD';
import { BATTLES_PATH } from '@/Routes';
import { MAX_ROUNDS } from '@/utils/constants';
import { formatWattHours } from '@/utils/helpers';

import { Button } from './ui/button';

type PlayAgainDialogProps = {
  isBattleOverDialogOpen: boolean;
  setIsBattleOverDialogOpen: (isOpen: boolean) => void;
};

export const PlayAgainDialog: React.FC<PlayAgainDialogProps> = ({
  isBattleOverDialogOpen,
  setIsBattleOverDialogOpen,
}) => {
  const navigate = useNavigate();
  const {
    components: {
      BatteryDetails,
      CurrentBattle,
      ExpenseReceipt,
      KingdomsByLevel,
      LoadedKingdomActions,
      RevenueReceipt,
      SavedKingdom,
      TopLevel,
      Username,
      WinStreak,
    },
    network: { globalPlayerId },
    systemCalls: { createBattle },
  } = useMUD();
  const { playSfx } = useSettings();
  const { setIsSolarFarmDialogOpen } = useSolarFarm();
  const { battle } = useBattle();

  const [isCreatingBattle, setIsCreatingBattle] = useState(false);

  const winStreak =
    useComponentValue(WinStreak, globalPlayerId)?.value ?? BigInt(0);
  const topLevel = useComponentValue(TopLevel, singletonEntity)?.level;
  const levelAsEntity = encodeEntity(
    { level: 'uint256' },
    { level: topLevel ?? 0n },
  );
  const topLevelKingdoms = useComponentValue(
    KingdomsByLevel,
    levelAsEntity,
  )?.savedKingdomIds;

  const topLevelKingdomsICanPlay = useMemo(() => {
    if (!(battle && topLevelKingdoms)) return [];

    return topLevelKingdoms.filter(savedKingdomId => {
      const savedTopLevelKingdom = getComponentValueStrict(
        SavedKingdom,
        savedKingdomId as Entity,
      );
      return savedTopLevelKingdom.author !== battle.player1Id;
    });
  }, [battle, SavedKingdom, topLevelKingdoms]);

  const onCreateBattle = useCallback(async () => {
    try {
      setIsCreatingBattle(true);
      playSfx('click2');

      if (!battle) {
        throw new Error('Battle not found.');
      }

      if (!globalPlayerId) {
        throw new Error('Player entity not found.');
      }

      const resetLevel =
        battle.winner !== battle.player1Id ||
        (topLevel === winStreak && topLevelKingdomsICanPlay.length === 0);

      const savedUsername = getComponentValue(Username, globalPlayerId)?.value;
      const batteryDetails = getComponentValue(BatteryDetails, globalPlayerId);
      const activeBalance = batteryDetails?.activeBalance ?? BigInt(0);
      const reserveBalance = batteryDetails?.reserveBalance ?? BigInt(0);
      const totalBalance = activeBalance + reserveBalance;

      if (totalBalance < BigInt(8000) && !!savedUsername && resetLevel) {
        setIsSolarFarmDialogOpen(true);
        return;
      }

      const { error, success } = await createBattle(
        battle.player1Username,
        resetLevel,
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Battle Created!');

      const newBattle = getComponentValue(CurrentBattle, globalPlayerId)?.value;
      if (!newBattle) {
        throw new Error('No recent battle found');
      }

      navigate(`${BATTLES_PATH}/${newBattle}`);
      setIsBattleOverDialogOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Creating Battle', {
        description: (error as Error).message,
      });
    } finally {
      setIsCreatingBattle(false);
    }
  }, [
    BatteryDetails,
    battle,
    createBattle,
    CurrentBattle,
    navigate,
    globalPlayerId,
    playSfx,
    setIsBattleOverDialogOpen,
    setIsSolarFarmDialogOpen,
    topLevel,
    topLevelKingdomsICanPlay,
    Username,
    winStreak,
  ]);

  const savedKingdomId =
    useComponentValue(LoadedKingdomActions, battle?.id ?? (zeroHash as Entity))
      ?.savedKingdomId ?? zeroHash;

  const expenseReceipt =
    useEntityQuery([
      HasValue(ExpenseReceipt, {
        battleId: battle?.id ?? (zeroHash as Entity),
        savedKingdomId: savedKingdomId,
      }),
    ]).map(receiptId =>
      getComponentValueStrict(ExpenseReceipt, receiptId),
    )[0] ?? null;

  const expensePatenteeUsernames = useMemo(() => {
    if (!expenseReceipt) return [];
    if (expenseReceipt.patentees.length === 0) return [];
    return expenseReceipt.patentees.map(patentee => {
      return getComponentValueStrict(Username, patentee as Entity).value;
    });
  }, [expenseReceipt, Username]);

  const expenseAmountToPatentees = useMemo(() => {
    if (!expenseReceipt) return BigInt(0);
    if (expenseReceipt.patentees.length === 0) return BigInt(0);
    return (
      expenseReceipt.amountToBattery / BigInt(expenseReceipt.patentees.length)
    );
  }, [expenseReceipt]);

  const revenueReceipt =
    useEntityQuery([
      HasValue(RevenueReceipt, {
        battleId: battle?.id ?? (zeroHash as Entity),
        savedKingdomId: savedKingdomId,
      }),
    ]).map(receiptId =>
      getComponentValueStrict(RevenueReceipt, receiptId),
    )[0] ?? null;

  const revenuePatenteeUsernames = useMemo(() => {
    if (!revenueReceipt) return [];
    if (revenueReceipt.patentees.length === 0) return [];
    return revenueReceipt.patentees.map(patentee => {
      return getComponentValueStrict(Username, patentee as Entity).value;
    });
  }, [revenueReceipt, Username]);

  const revenueAmountToPatentees = useMemo(() => {
    if (!revenueReceipt) return BigInt(0);
    if (revenueReceipt.patentees.length === 0) return BigInt(0);
    return (
      revenueReceipt.amountToReserve / BigInt(revenueReceipt.patentees.length)
    );
  }, [revenueReceipt]);

  if (!battle) {
    return (
      <Dialog
        open={isBattleOverDialogOpen}
        onOpenChange={open => setIsBattleOverDialogOpen(open)}
      >
        <DialogContent
          aria-describedby={undefined}
          className="bg-gray-900 border border-pink-900/50 text-white"
        >
          <DialogHeader>
            <DialogTitle className="text-red-400 text-xl">
              An Error Occurred
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center my-4">
            <AlertTriangle className="h-16 text-red-500 mb-4 w-16" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (topLevel === winStreak && topLevelKingdomsICanPlay.length === 0) {
    return (
      <Dialog
        open={isBattleOverDialogOpen}
        onOpenChange={open => setIsBattleOverDialogOpen(open)}
      >
        <DialogContent
          aria-describedby={undefined}
          className="bg-gray-900 border border-cyan-900/50 max-h-[90vh] overflow-y-auto text-white"
        >
          <DialogHeader>
            <DialogTitle className="text-cyan-400 text-xl">
              Victory!
            </DialogTitle>
          </DialogHeader>
          <p>
            Congratulations! You are now{' '}
            {topLevelKingdoms?.length === 1 ? 'the' : 'a'}{' '}
            <strong>top player</strong>!
          </p>
          <p>
            Your battle has been saved, and other players can try to beat it.
            Playing again does not affect your top position.
          </p>

          {expenseReceipt && (
            <div className="my-4 space-y-6">
              <div className="flex justify-center">
                <Trophy className="h-16 text-blue-400 w-16" />
              </div>

              <div className="bg-gray-800/60 border border-blue-900/30 overflow-hidden rounded-lg">
                <div className="bg-blue-900/30 border-b border-blue-900/30 px-4 py-2">
                  <h3 className="font-medium text-blue-300 text-lg">
                    Battle Receipt
                  </h3>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Enemy Total Staked:</span>
                    <span className="font-medium text-white">
                      {formatWattHours(
                        expenseReceipt.amountToKingdom * BigInt(4),
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">
                      Enemy Total Slashed (50%):
                    </span>
                    <span className="font-medium text-red-400">
                      {formatWattHours(
                        expenseReceipt.amountToKingdom * BigInt(2),
                      )}
                    </span>
                  </div>

                  <div className="border-t border-gray-700 my-2"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Kingdom Revenue:</span>
                    <span className="font-medium text-green-400">
                      {formatWattHours(expenseReceipt.amountToKingdom)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Battery Revenue:</span>
                    <span className="font-medium text-green-400">
                      {formatWattHours(expenseReceipt.amountToBattery)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Tower Royalties:</span>
                      <span className="font-medium text-yellow-400">
                        {formatWattHours(
                          expensePatenteeUsernames.length > 0
                            ? expenseReceipt.amountToBattery
                            : BigInt(0),
                        )}
                      </span>
                    </div>

                    {/* Individual Tower Component Patentees */}
                    {expensePatenteeUsernames.length > 0 && (
                      <div className="bg-gray-900/50 ml-4 p-2 rounded space-y-2 text-sm">
                        {expensePatenteeUsernames.map((author, index) => (
                          <div
                            className="flex items-center justify-between"
                            key={`${author}-${index}`}
                          >
                            <div className="flex gap-2 items-center">
                              <GiCannon className="h-4 text-cyan-400 w-4" />
                              <span className="text-gray-300">{author}</span>
                            </div>
                            <span className="font-medium text-cyan-400">
                              {formatWattHours(expenseAmountToPatentees)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button
              disabled={isCreatingBattle}
              onClick={onCreateBattle}
              className="bg-blue-800 hover:bg-blue-700 text-white w-full"
            >
              {isCreatingBattle ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <Play className="h-4 mr-2 w-4" />
              )}
              Play Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (battle.winner === battle.player1Id) {
    return (
      <Dialog
        open={isBattleOverDialogOpen}
        onOpenChange={open => setIsBattleOverDialogOpen(open)}
      >
        <DialogContent className="bg-gray-900 border border-blue-900/50 max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-blue-400 text-xl">
              Victory!
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-2">
              You have successfully defeated your opponent.
            </DialogDescription>
          </DialogHeader>

          <p>{`You beat level ${battle.level.toString()}! You can now continue to level ${(battle.level + 1n).toString()}.`}</p>

          {expenseReceipt && (
            <div className="my-4 space-y-6">
              <div className="flex justify-center">
                <Trophy className="h-16 text-blue-400 w-16" />
              </div>

              <div className="bg-gray-800/60 border border-blue-900/30 overflow-hidden rounded-lg">
                <div className="bg-blue-900/30 border-b border-blue-900/30 px-4 py-2">
                  <h3 className="font-medium text-blue-300 text-lg">
                    Battle Receipt
                  </h3>
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Enemy Total Staked:</span>
                    <span className="font-medium text-white">
                      {formatWattHours(
                        expenseReceipt.amountToKingdom * BigInt(4),
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">
                      Enemy Total Slashed (50%):
                    </span>
                    <span className="font-medium text-red-400">
                      {formatWattHours(
                        expenseReceipt.amountToKingdom * BigInt(2),
                      )}
                    </span>
                  </div>

                  <div className="border-t border-gray-700 my-2"></div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Kingdom Revenue:</span>
                    <span className="font-medium text-green-400">
                      {formatWattHours(expenseReceipt.amountToKingdom)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Battery Revenue:</span>
                    <span className="font-medium text-green-400">
                      {formatWattHours(expenseReceipt.amountToBattery)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Tower Royalties:</span>
                      <span className="font-medium text-yellow-400">
                        {formatWattHours(
                          expensePatenteeUsernames.length > 0
                            ? expenseReceipt.amountToBattery
                            : BigInt(0),
                        )}
                      </span>
                    </div>

                    {/* Individual Tower Component Patentees */}
                    {expensePatenteeUsernames.length > 0 && (
                      <div className="bg-gray-900/50 ml-4 p-2 rounded space-y-2 text-sm">
                        {expensePatenteeUsernames.map((patentee, index) => (
                          <div
                            className="flex items-center justify-between"
                            key={`${patentee}-${index}`}
                          >
                            <div className="flex gap-2 items-center">
                              <GiCannon className="h-4 text-cyan-400 w-4" />
                              <span className="text-gray-300">{patentee}</span>
                            </div>
                            <span className="font-medium text-cyan-400">
                              {formatWattHours(expenseAmountToPatentees)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button
              disabled={isCreatingBattle}
              onClick={onCreateBattle}
              className="bg-blue-800 hover:bg-blue-700 text-white w-full"
            >
              {isCreatingBattle ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <Play className="h-4 mr-2 w-4" />
              )}
              Next Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isBattleOverDialogOpen}
      onOpenChange={open => setIsBattleOverDialogOpen(open)}
    >
      <DialogContent className="bg-gray-900 border border-pink-900/50  max-h-[90vh] overflow-y-auto text-white">
        <DialogHeader>
          <DialogTitle className="text-pink-400 text-xl">Defeat!</DialogTitle>
          <DialogDescription className="mt-2 text-gray-300">
            Your castle has been destroyed by the enemy.
          </DialogDescription>
        </DialogHeader>
        {battle.winner !== battle.player1Id &&
          battle.roundCount > MAX_ROUNDS && (
            <p className="font-semibold mt-2">
              You have reached the max rounds you can play in a battle.
            </p>
          )}

        {revenueReceipt && (
          <div className="my-4 space-y-6">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 text-pink-400 w-16" />
            </div>

            <div className="bg-gray-800/60 border border-pink-900/30 overflow-hidde rounded-lgn">
              <div className="bg-pink-900/30 border-b border-pink-900/30 px-4 py-2">
                <h3 className="font-medium text-lg text-pink-300">
                  Battle Receipt
                </h3>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Your Total Staked:</span>
                  <span className="font-medium text-white">
                    {formatWattHours(
                      revenueReceipt.amountToKingdom * BigInt(4),
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">
                    Your Total Slashed (50%):
                  </span>
                  <span className="font-medium text-red-400">
                    {formatWattHours(
                      revenueReceipt.amountToKingdom * BigInt(2),
                    )}
                  </span>
                </div>

                <div className="border-gray-700 border-t my-2"></div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Enemy Kingdom Revenue:</span>
                  <span className="font-medium text-red-400">
                    {formatWattHours(revenueReceipt.amountToKingdom)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Enemy Battery Revenue:</span>
                  <span className="font-medium text-red-400">
                    {formatWattHours(revenueReceipt.amountToReserve)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Tower Royalties:</span>
                    <span className="font-medium text-yellow-400">
                      {formatWattHours(
                        revenuePatenteeUsernames.length > 0
                          ? revenueReceipt.amountToReserve
                          : BigInt(0),
                      )}
                    </span>
                  </div>

                  {/* Individual Tower Component Patentees */}
                  {revenuePatenteeUsernames.length > 0 && (
                    <div className="bg-gray-900/50 ml-4 p-2 rounded space-y-2 text-sm">
                      {revenuePatenteeUsernames.map((patentee, index) => (
                        <div
                          className="flex items-center justify-between"
                          key={`${patentee}-${index}`}
                        >
                          <div className="flex gap-2 items-center">
                            <GiCannon className="h-4 text-cyan-400 w-4" />
                            <span className="text-gray-300">{patentee}</span>
                          </div>
                          <span className="font-medium text-cyan-400">
                            {formatWattHours(revenueAmountToPatentees)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-center">
          <Button
            disabled={isCreatingBattle}
            onClick={onCreateBattle}
            className="bg-pink-800 hover:bg-pink-700 text-white w-full"
          >
            {isCreatingBattle ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              <Play className="h-4 mr-2 w-4" />
            )}
            Play Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
