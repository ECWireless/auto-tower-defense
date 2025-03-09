import { useComponentValue } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
} from '@latticexyz/recs';
import { encodeEntity, singletonEntity } from '@latticexyz/store-sync/recs';
import { AlertTriangle, Frown, Loader2, Play, Trophy } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGame } from '@/contexts/GameContext';
import { useMUD } from '@/MUDContext';
import { GAMES_PATH } from '@/Routes';
import { MAX_ROUNDS } from '@/utils/constants';

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
      CurrentGame,
      Game,
      GamesByLevel,
      SavedGame,
      TopLevel,
      WinStreak,
    },
    network: { playerEntity },
    systemCalls: { createGame },
  } = useMUD();
  const { game } = useGame();

  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const winStreak =
    useComponentValue(WinStreak, playerEntity)?.value ?? BigInt(0);
  const topLevel = useComponentValue(TopLevel, singletonEntity)?.level;
  const levelAsEntity = encodeEntity(
    { level: 'uint256' },
    { level: topLevel ?? 0n },
  );
  const topLevelGames = useComponentValue(GamesByLevel, levelAsEntity)?.gameIds;

  const topLevelGamesICanPlay = useMemo(() => {
    if (!(game && topLevelGames)) return [];

    return topLevelGames.filter(gameId => {
      const savedTopLevelGame = getComponentValueStrict(
        SavedGame,
        gameId as Entity,
      );
      const topLevelGame = getComponentValueStrict(
        Game,
        savedTopLevelGame.gameId as Entity,
      );
      return topLevelGame.player1Address !== game.player1Address;
    });
  }, [game, Game, SavedGame, topLevelGames]);

  const onCreateGame = useCallback(async () => {
    try {
      setIsCreatingGame(true);

      if (!game) {
        throw new Error('Game not found.');
      }

      const resetLevel =
        game.winner !== game.player1Address ||
        (topLevel === winStreak && topLevelGamesICanPlay.length === 0);

      const { error, success } = await createGame(
        game.player1Username,
        resetLevel,
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast('Game Created!');

      const newGame = getComponentValue(CurrentGame, playerEntity)?.value;
      if (!newGame) {
        throw new Error('No recent game found');
      }

      navigate(`${GAMES_PATH}/${newGame}`);
      setIsGameOverDialogOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast('Error Creating Game', {
        description: (error as Error).message,
      });
    } finally {
      setIsCreatingGame(false);
    }
  }, [
    createGame,
    CurrentGame,
    game,
    navigate,
    playerEntity,
    setIsGameOverDialogOpen,
    topLevel,
    topLevelGamesICanPlay,
    winStreak,
  ]);

  if (!game) {
    return (
      <Dialog
        open={isGameOverDialogOpen}
        onOpenChange={open => setIsGameOverDialogOpen(open)}
      >
        <DialogContent className="bg-gray-900 border border-pink-900/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400 text-xl">
              An Error Occurred
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center my-4">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (topLevel === winStreak && topLevelGamesICanPlay.length === 0) {
    return (
      <Dialog
        open={isGameOverDialogOpen}
        onOpenChange={open => setIsGameOverDialogOpen(open)}
      >
        <DialogContent className="bg-gray-900 border border-cyan-900/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 text-xl">
              Game Won
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-2">
              <p>
                Congratulations! You are now{' '}
                {topLevelGames?.length === 1 ? 'the' : 'a'}{' '}
                <strong>top player</strong>!
              </p>
              <p className="mt-2">
                Your game has been saved, and other players can try to beat it.
                Playing again does not affect your top position.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center my-4">
            <Trophy className="h-16 w-16 text-cyan-400" />
          </div>
          <DialogFooter>
            <Button
              disabled={isCreatingGame}
              onClick={onCreateGame}
              className="w-full bg-cyan-400 hover:bg-cyan-900 text-white"
            >
              {isCreatingGame ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Play Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (game.winner === game.player1Address) {
    return (
      <Dialog
        open={isGameOverDialogOpen}
        onOpenChange={open => setIsGameOverDialogOpen(open)}
      >
        <DialogContent className="bg-gray-900 border border-cyan-900/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 text-xl">
              Game Won
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-2">
              {`You beat level ${game.level.toString()}! You can now continue to level ${(game.level + 1n).toString()}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center my-4">
            <Trophy className="h-16 w-16 text-cyan-400" />
          </div>
          <DialogFooter>
            <Button
              disabled={isCreatingGame}
              onClick={onCreateGame}
              className="w-full bg-cyan-400 hover:bg-cyan-900 text-white"
            >
              {isCreatingGame ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
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
      <DialogContent className="bg-gray-900 border border-pink-900/50 text-white">
        <DialogHeader>
          <DialogTitle className="text-pink-400 text-xl">Game Over</DialogTitle>
          <DialogDescription className="text-gray-300 mt-2">
            <p>You lost!</p>
            {game.winner !== game.player1Address &&
              game.roundCount > MAX_ROUNDS && (
                <p className="font-semibold mt-2">
                  You have reached the max rounds you can play in a game.
                </p>
              )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center my-4">
          <Frown className="h-16 w-16 text-pink-400" />
        </div>
        <DialogFooter>
          <Button
            disabled={isCreatingGame}
            onClick={onCreateGame}
            className="w-full bg-pink-800 hover:bg-pink-700 text-white"
          >
            {isCreatingGame ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Play Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
