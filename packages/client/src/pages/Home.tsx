import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
} from '@latticexyz/recs';
import { Loader2, Play } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { HomeTabs } from '@/components/HomeTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMUD } from '@/MUDContext';
import { GAMES_PATH } from '@/Routes';

export const Home = (): JSX.Element => {
  const navigate = useNavigate();
  const {
    components: { CurrentGame, Game, Username },
    network: { playerEntity },
    systemCalls: { createGame },
  } = useMUD();

  const [username, setUsername] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  // Ensure home page title is always "Auto Tower Defense"
  useEffect(() => {
    document.title = `Auto Tower Defense`;
  }, []);

  const onCreateGame = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        setIsCreatingGame(true);

        let currentGame = getComponentValue(CurrentGame, playerEntity)?.value;
        if (currentGame) {
          const game = getComponentValueStrict(Game, currentGame as Entity);
          if (game.endTimestamp === BigInt(0)) {
            navigate(`${GAMES_PATH}/${currentGame}`);
            return;
          }
        }

        const { error, success } = await createGame(username, true);

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
    [createGame, CurrentGame, Game, navigate, playerEntity, username],
  );

  useEffect(() => {
    const savedUsername = getComponentValue(Username, playerEntity)?.value;
    if (savedUsername) {
      setUsername(savedUsername);
      setUsernameSaved(true);
    }
  }, [Username, playerEntity]);

  return (
    <div className="bg-black flex flex-col min-h-screen p-4 relative text-white">
      <BackgroundAnimation />

      <h1 className="bg-clip-text bg-gradient-to-r font-bold from-purple-400 my-20 text-center text-transparent text-4xl to-pink-400 via-cyan-400">
        AUTO TOWER DEFENSE
      </h1>

      {usernameSaved && (
        <div className="mb-8 neon-text-cyan text-center text-xl">
          Welcome back, {username}!
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
                id="username"
                onChange={e => setUsername(e.target.value)}
                placeholder="ROB"
                required
                type="text"
                value={username}
              />
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

      <div className="mb-20 z-1">
        <HomeTabs />
      </div>
    </div>
  );
};
