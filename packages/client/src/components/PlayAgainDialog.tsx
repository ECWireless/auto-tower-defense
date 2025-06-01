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
import { useGame } from '@/contexts/BattleContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useSolarFarm } from '@/contexts/SolarFarmContext';
import { useMUD } from '@/hooks/useMUD';
import { GAMES_PATH } from '@/Routes';
import { MAX_ROUNDS } from '@/utils/constants';
import { formatWattHours } from '@/utils/helpers';

import { Button } from './ui/button';

type PlayAgainDialogProps = {
  isGameOverDialogOpen: boolean;
  setIsGameOverDialogOpen: (isOpen: boolean) => void;
};

export const PlayAgainDialog: React.FC<PlayAgainDialogProps> = ({
  isGameOverDialogOpen,
  setIsGameOverDialogOpen,
}) => {
  const navigate = useNavigate();
  const {
    components: {
      BatteryDetails,
      CurrentGame,
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
    systemCalls: { createGame },
  } = useMUD();
  const { playSfx } = useSettings();
  const { setIsSolarFarmDialogOpen } = useSolarFarm();
  const { game } = useGame();

  const [isCreatingGame, setIsCreatingGame] = useState(false);

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
    if (!(game && topLevelKingdoms)) return [];

    return topLevelKingdoms.filter(savedKingdomId => {
      const savedTopLevelKingdom = getComponentValueStrict(
        SavedKingdom,
        savedKingdomId as Entity,
      );
      return savedTopLevelKingdom.author !== game.player1Id;
    });
  }, [game, SavedKingdom, topLevelKingdoms]);

  const onCreateGame = useCallback(async () => {
    try {
      setIsCreatingGame(true);
      playSfx('click2');

      if (!game) {
        throw new Error('Game not found.');
      }

      if (!globalPlayerId) {
        throw new Error('Player entity not found.');
      }

      const resetLevel =
        game.winner !== game.player1Id ||
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

      const { error, success } = await createGame(
        game.player1Username,
        resetLevel,
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Game Created!');

      const newGame = getComponentValue(CurrentGame, globalPlayerId)?.value;
      if (!newGame) {
        throw new Error('No recent game found');
      }

      navigate(`${GAMES_PATH}/${newGame}`);
      setIsGameOverDialogOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Creating Game', {
        description: (error as Error).message,
      });
    } finally {
      setIsCreatingGame(false);
    }
  }, [
    BatteryDetails,
    createGame,
    CurrentGame,
    game,
    navigate,
    globalPlayerId,
    playSfx,
    setIsGameOverDialogOpen,
    setIsSolarFarmDialogOpen,
    topLevel,
    topLevelKingdomsICanPlay,
    Username,
    winStreak,
  ]);

  const savedKingdomId =
    useComponentValue(LoadedKingdomActions, game?.id ?? (zeroHash as Entity))
      ?.savedKingdomId ?? zeroHash;

  const expenseReceipt =
    useEntityQuery([
      HasValue(ExpenseReceipt, {
        gameId: game?.id ?? (zeroHash as Entity),
        savedKingdomId: savedKingdomId,
      }),
    ]).map(receiptId =>
      getComponentValueStrict(ExpenseReceipt, receiptId),
    )[0] ?? null;

  const expenseAuthorUsernames = useMemo(() => {
    if (!expenseReceipt) return [];
    if (expenseReceipt.authors.length === 0) return [];
    return expenseReceipt.authors.map(author => {
      const authorEntity = encodeEntity(
        { author: 'address' },
        { author: author as `0x${string}` },
      );
      return getComponentValueStrict(Username, authorEntity).value;
    });
  }, [expenseReceipt, Username]);

  const expenseAmountToAuthors = useMemo(() => {
    if (!expenseReceipt) return BigInt(0);
    if (expenseReceipt.authors.length === 0) return BigInt(0);
    return (
      expenseReceipt.amountToBattery / BigInt(expenseReceipt.authors.length)
    );
  }, [expenseReceipt]);

  const revenueReceipt =
    useEntityQuery([
      HasValue(RevenueReceipt, {
        gameId: game?.id ?? (zeroHash as Entity),
        savedKingdomId: savedKingdomId,
      }),
    ]).map(receiptId =>
      getComponentValueStrict(RevenueReceipt, receiptId),
    )[0] ?? null;

  const revenueAuthorUsernames = useMemo(() => {
    if (!revenueReceipt) return [];
    if (revenueReceipt.authors.length === 0) return [];
    return revenueReceipt.authors.map(author => {
      const authorEntity = encodeEntity(
        { author: 'address' },
        { author: author as `0x${string}` },
      );
      return getComponentValueStrict(Username, authorEntity).value;
    });
  }, [revenueReceipt, Username]);

  const revenueAmountToAuthors = useMemo(() => {
    if (!revenueReceipt) return BigInt(0);
    if (revenueReceipt.authors.length === 0) return BigInt(0);
    return (
      revenueReceipt.amountToReserve / BigInt(revenueReceipt.authors.length)
    );
  }, [revenueReceipt]);

  if (!game) {
    return (
      <Dialog
        open={isGameOverDialogOpen}
        onOpenChange={open => setIsGameOverDialogOpen(open)}
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
        open={isGameOverDialogOpen}
        onOpenChange={open => setIsGameOverDialogOpen(open)}
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
            Your game has been saved, and other players can try to beat it.
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
                          expenseAuthorUsernames.length > 0
                            ? expenseReceipt.amountToBattery
                            : BigInt(0),
                        )}
                      </span>
                    </div>

                    {/* Individual Tower Authors */}
                    {expenseAuthorUsernames.length > 0 && (
                      <div className="bg-gray-900/50 ml-4 p-2 rounded space-y-2 text-sm">
                        {expenseAuthorUsernames.map((author, index) => (
                          <div
                            className="flex items-center justify-between"
                            key={`${author}-${index}`}
                          >
                            <div className="flex gap-2 items-center">
                              <GiCannon className="h-4 text-cyan-400 w-4" />
                              <span className="text-gray-300">{author}</span>
                            </div>
                            <span className="font-medium text-cyan-400">
                              {formatWattHours(expenseAmountToAuthors)}
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
              disabled={isCreatingGame}
              onClick={onCreateGame}
              className="bg-blue-800 hover:bg-blue-700 text-white w-full"
            >
              {isCreatingGame ? (
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

  if (game.winner === game.player1Id) {
    return (
      <Dialog
        open={isGameOverDialogOpen}
        onOpenChange={open => setIsGameOverDialogOpen(open)}
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

          <p>{`You beat level ${game.level.toString()}! You can now continue to level ${(game.level + 1n).toString()}.`}</p>

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
                          expenseAuthorUsernames.length > 0
                            ? expenseReceipt.amountToBattery
                            : BigInt(0),
                        )}
                      </span>
                    </div>

                    {/* Individual Tower Authors */}
                    {expenseAuthorUsernames.length > 0 && (
                      <div className="bg-gray-900/50 ml-4 p-2 rounded space-y-2 text-sm">
                        {expenseAuthorUsernames.map((author, index) => (
                          <div
                            className="flex items-center justify-between"
                            key={`${author}-${index}`}
                          >
                            <div className="flex gap-2 items-center">
                              <GiCannon className="h-4 text-cyan-400 w-4" />
                              <span className="text-gray-300">{author}</span>
                            </div>
                            <span className="font-medium text-cyan-400">
                              {formatWattHours(expenseAmountToAuthors)}
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
              disabled={isCreatingGame}
              onClick={onCreateGame}
              className="bg-blue-800 hover:bg-blue-700 text-white w-full"
            >
              {isCreatingGame ? (
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
      open={isGameOverDialogOpen}
      onOpenChange={open => setIsGameOverDialogOpen(open)}
    >
      <DialogContent className="bg-gray-900 border border-pink-900/50  max-h-[90vh] overflow-y-auto text-white">
        <DialogHeader>
          <DialogTitle className="text-pink-400 text-xl">Defeat!</DialogTitle>
          <DialogDescription className="mt-2 text-gray-300">
            Your castle has been destroyed by the enemy.
          </DialogDescription>
        </DialogHeader>
        {game.winner !== game.player1Id && game.roundCount > MAX_ROUNDS && (
          <p className="font-semibold mt-2">
            You have reached the max rounds you can play in a game.
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
                        revenueAuthorUsernames.length > 0
                          ? revenueReceipt.amountToReserve
                          : BigInt(0),
                      )}
                    </span>
                  </div>

                  {/* Individual Tower Authors */}
                  {revenueAuthorUsernames.length > 0 && (
                    <div className="bg-gray-900/50 ml-4 p-2 rounded space-y-2 text-sm">
                      {revenueAuthorUsernames.map((author, index) => (
                        <div
                          className="flex items-center justify-between"
                          key={`${author}-${index}`}
                        >
                          <div className="flex gap-2 items-center">
                            <GiCannon className="h-4 text-cyan-400 w-4" />
                            <span className="text-gray-300">{author}</span>
                          </div>
                          <span className="font-medium text-cyan-400">
                            {formatWattHours(revenueAmountToAuthors)}
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
            disabled={isCreatingGame}
            onClick={onCreateGame}
            className="bg-pink-800 hover:bg-pink-700 text-white w-full"
          >
            {isCreatingGame ? (
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
