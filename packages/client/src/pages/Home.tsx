import { useEntityQuery } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
  Has,
} from '@latticexyz/recs';
import { decodeEntity, encodeEntity } from '@latticexyz/store-sync/recs';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Loader2,
  Play,
  Trophy,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Address } from 'viem';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMUD } from '@/MUDContext';
import { GAMES_PATH } from '@/Routes';
import { shortenAddress } from '@/utils/helpers';
import { type Game } from '@/utils/types';

const formatDateFromTimestamp = (timestamp: bigint): string => {
  const date = new Date(timestamp.toString());

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTimeFromTimestamp = (timestamp: bigint): string => {
  const date = new Date(timestamp.toString());

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format duration in minutes to readable string (e.g., "1h 15m" or "45m")
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${remainingMinutes}m`;
  }
};

const getElapsedTime = (
  startTimestamp: bigint,
  endTimestamp: bigint,
): string => {
  const startTime = new Date(startTimestamp.toString());
  const endTime = new Date(endTimestamp.toString());
  const elapsedMs = endTime.getTime() - startTime.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  return formatDuration(elapsedMinutes);
};

const CompletedGameCard = ({
  game,
  onClick,
}: {
  game: Game;
  onClick: () => void;
}) => {
  return (
    <Card
      className="bg-black border-gray-800 mb-3 cursor-pointer hover:bg-gray-900"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-sm text-white">
              {formatDateFromTimestamp(game.startTimestamp)}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>

        <div className="flex justify-between mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-sm text-white">
              {formatTimeFromTimestamp(game.startTimestamp)} •{' '}
              {formatDuration(12)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-2">
          <Users className="h-3 w-3 text-gray-400 mr-1" />
          <span className="text-sm text-white">
            {game.player1Username} vs {game.player2Username}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-gray-400 mr-1" />
          <span className="text-sm font-medium text-white">{game.winner}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const ActiveGameCard = ({
  game,
  onClick,
}: {
  game: Game;
  onClick: () => void;
}) => {
  return (
    <Card
      className="bg-black border-gray-800 mb-3 cursor-pointer hover:bg-gray-900"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-sm text-white">
              {formatDateFromTimestamp(game.startTimestamp)}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>

        <div className="flex justify-between mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-sm text-white">
              {formatTimeFromTimestamp(game.startTimestamp)} •{' '}
              {getElapsedTime(game.startTimestamp, BigInt(Date.now()))} elapsed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-2">
          <Users className="h-3 w-3 text-gray-400 mr-1" />
          <div className="text-sm text-white">
            <span>{game.player1Username}</span>
            {game.turn === game.player1Address && (
              <Badge
                variant="outline"
                className="h-4 px-1 text-xs border-green-500 text-green-500 ml-1"
              >
                Turn
              </Badge>
            )}
            <span className="mx-1">vs</span>
            <span>{game.player2Username}</span>
            {game.turn === game.player2Address && (
              <Badge
                variant="outline"
                className="h-4 px-1 text-xs border-green-500 text-green-500 ml-1"
              >
                Turn
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-white">
            {game.turn === game.player1Address
              ? game.player1Username
              : game.player2Username}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const GameTabs = () => {
  const navigate = useNavigate();
  const {
    components: { Game, GamesByLevel, SavedGame, Username },
  } = useMUD();

  const games = useEntityQuery([Has(Game)]).map(entity => {
    const _game = getComponentValueStrict(Game, entity);

    const player1Entity = encodeEntity(
      { playerAddress: 'address' },
      { playerAddress: _game.player1Address as Address },
    );
    const player2Entity = encodeEntity(
      { playerAddress: 'address' },
      { playerAddress: _game.player2Address as Address },
    );
    const _player1Username = getComponentValueStrict(
      Username,
      player1Entity,
    ).value;
    const _player2Username = getComponentValueStrict(
      Username,
      player2Entity,
    ).value;

    return {
      id: entity,
      actionCount: _game.actionCount,
      endTimestamp: _game.endTimestamp,
      player1Address: _game.player1Address as Address,
      player1Username: _player1Username,
      player2Address: _game.player2Address as Address,
      player2Username: _player2Username,
      roundCount: _game.roundCount,
      startTimestamp: _game.startTimestamp,
      turn: _game.turn as Address,
      winner: _game.winner as Address,
    };
  }) as Game[];

  const gamesByLevel = useEntityQuery([Has(GamesByLevel)]).map(entity => {
    const _gamesByLevel = getComponentValueStrict(GamesByLevel, entity);
    const winners = _gamesByLevel.gameIds.map(gameId => {
      const savedGame = getComponentValueStrict(SavedGame, gameId as Entity);
      return savedGame.winner;
    });

    const decodedKey = decodeEntity({ level: 'uint256' }, entity);

    return {
      level: decodedKey.level,
      winners,
    };
  });

  const leaderboardList: {
    address: string;
    level: number;
    username: string;
  }[] = useMemo(() => {
    const fullLeaderboardList = gamesByLevel.reduce(
      (acc, game) => {
        const { level, winners } = game;
        const levelWinners = winners.map(winner => ({
          address: winner,
          level: Number(level),
          username: getComponentValueStrict(
            Username,
            encodeEntity(
              { playerAddress: 'address' },
              { playerAddress: winner as `0x${string}` },
            ),
          ).value,
        }));

        return [...acc, ...levelWinners];
      },
      [] as { address: string; level: number; username: string }[],
    );

    const leaderboardNoDuplicates = Object.values(
      fullLeaderboardList.reduce(
        (acc, entry) => {
          const existing = acc[entry.address];
          if (!existing || existing.level < entry.level) {
            acc[entry.address] = entry;
          }
          return acc;
        },
        {} as Record<
          string,
          { address: string; level: number; username: string }
        >,
      ),
    );

    return leaderboardNoDuplicates.sort((a, b) => b.level - a.level);
  }, [gamesByLevel, Username]);

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyToClipboard = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  }, []);

  const activeGames = useMemo(
    () => games.filter(game => game.endTimestamp === BigInt(0)),
    [games],
  );

  const completedGames = useMemo(
    () => games.filter(game => game.endTimestamp !== BigInt(0)),
    [games],
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-transparent">
          <TabsTrigger
            value="leaderboard"
            className="data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:rounded-none data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 text-gray-400 text-xs sm:text-sm hover:text-cyan-300"
          >
            Leaderboard ({leaderboardList.length})
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:rounded-none data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 text-gray-400 text-xs sm:text-sm hover:text-cyan-300"
          >
            Active ({activeGames.length})
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:rounded-none data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 text-gray-400 text-xs sm:text-sm hover:text-cyan-300"
          >
            Completed ({completedGames.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-6">
          <TooltipProvider>
            {/* Desktop view for leaderboard */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-cyan-400">Rank</TableHead>
                    <TableHead className="text-cyan-400">Player</TableHead>
                    <TableHead className="text-cyan-400">Level</TableHead>
                    <TableHead className="text-cyan-400">Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardList.map((player, i) => (
                    <TableRow key={player.address} className="border-gray-800">
                      <TableCell className="font-medium">{i}</TableCell>
                      <TableCell>{player.username}</TableCell>
                      <TableCell>{player.level}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{shortenAddress(player.address)}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-white"
                                onClick={() => copyToClipboard(player.address)}
                              >
                                {copiedAddress === player.address ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {copiedAddress === player.address
                                  ? 'Copied!'
                                  : 'Copy address'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile view for leaderboard */}
            <div className="md:hidden">
              {leaderboardList.map((player, i) => (
                <Card
                  key={player.address}
                  className="bg-gray-900 border-gray-800 mb-3 hover:border-cyan-900"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">#{i}</span>
                        <span className="text-white">{player.username}</span>
                      </div>
                      <span className="text-sm text-white">
                        Level {player.level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">
                        {shortenAddress(player.address)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-white"
                        onClick={() => copyToClipboard(player.address)}
                      >
                        {copiedAddress === player.address ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TooltipProvider>
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {/* Desktop view for active games */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Start Time</TableHead>
                  <TableHead className="text-white">Elapsed</TableHead>
                  <TableHead className="text-white">Players</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeGames.map(game => (
                  <TableRow
                    key={game.id}
                    className="border-gray-800 cursor-pointer hover:bg-gray-900"
                    onClick={() => navigate(`${GAMES_PATH}/${game.id}`)}
                  >
                    <TableCell>
                      {formatDateFromTimestamp(game.startTimestamp)}
                    </TableCell>
                    <TableCell>
                      {formatTimeFromTimestamp(game.startTimestamp)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>
                          {getElapsedTime(
                            game.startTimestamp,
                            game.endTimestamp,
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{game.player1Username}</span>
                          {game.turn === game.player1Address && (
                            <Badge
                              variant="outline"
                              className="h-5 px-1 text-xs border-green-500 text-green-500"
                            >
                              Turn
                            </Badge>
                          )}
                        </div>
                        <span className="text-gray-400">vs</span>
                        <div className="flex items-center gap-2">
                          <span>{game.player2Username}</span>
                          {game.turn === game.player2Address && (
                            <Badge
                              variant="outline"
                              className="h-5 px-1 text-xs border-green-500 text-green-500"
                            >
                              Turn
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {game.turn === game.player1Address
                        ? game.player1Username
                        : game.player2Username}
                    </TableCell>
                    <TableCell className="text-right">
                      <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile view for active games */}
          <div className="md:hidden">
            {activeGames.map(game => (
              <ActiveGameCard
                key={game.id}
                game={game}
                onClick={() => navigate(`${GAMES_PATH}/${game.id}`)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {/* Desktop view for completed games */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Start Time</TableHead>
                  <TableHead className="text-white">Duration</TableHead>
                  <TableHead className="text-white">Players</TableHead>
                  <TableHead className="text-white">Winner</TableHead>
                  <TableHead className="text-white w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedGames.map(game => (
                  <TableRow
                    key={game.id}
                    className="border-gray-800 cursor-pointer hover:bg-gray-900"
                    onClick={() => navigate(`${GAMES_PATH}/${game.id}`)}
                  >
                    <TableCell>
                      {formatDateFromTimestamp(game.startTimestamp)}
                    </TableCell>
                    <TableCell>
                      {formatTimeFromTimestamp(game.startTimestamp)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>
                          {getElapsedTime(
                            game.startTimestamp,
                            game.endTimestamp,
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{game.player1Username}</span>
                        <span className="text-gray-400">vs</span>
                        <span>{game.player2Username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {game.winner === game.player1Address
                        ? game.player1Username
                        : game.player2Username}
                    </TableCell>
                    <TableCell className="text-right">
                      <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile view for completed games */}
          <div className="md:hidden">
            {completedGames.map(game => (
              <CompletedGameCard
                key={game.id}
                game={game}
                onClick={() => navigate(`${GAMES_PATH}/${game.id}`)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

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

        toast('Game Created!');

        currentGame = getComponentValue(CurrentGame, playerEntity)?.value;

        if (!currentGame) {
          throw new Error('No recent game found');
        }

        navigate(`${GAMES_PATH}/${currentGame}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        toast('Error Creating Game', {
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

  // Username input screen
  if (!usernameSaved) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white p-4 relative">
        <BackgroundAnimation />
        <h1 className="text-4xl font-bold mt-10 mb-20 text-center bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 text-transparent bg-clip-text">
          AUTO TOWER DEFENSE
        </h1>

        <div className="w-full max-w-md mx-auto mb-8">
          <form onSubmit={onCreateGame} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-lg text-cyan-300">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-transparent border-cyan-800 focus:border-cyan-600 text-cyan-100 focus:ring-cyan-700"
                placeholder="ROB"
                required
              />
            </div>
            <div className="flex justify-center mb-16">
              <Button
                disabled={!username.trim() || isCreatingGame}
                type="submit"
                variant="outline"
                size="icon"
                className="rounded-full w-16 h-16 border-cyan-500 text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-400 hover:text-cyan-300 focus:text-cyan-300 focus:bg-cyan-900/30 active:bg-cyan-900/50 active:scale-95 transition-all duration-200 neon-border"
                aria-label="Submit username and play"
              >
                {isCreatingGame ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="mb-20">
          <GameTabs />
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-4 relative">
      <BackgroundAnimation />
      <h1 className="text-4xl font-bold mt-10 mb-20 text-center bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 text-transparent bg-clip-text">
        AUTO TOWER DEFENSE
      </h1>

      <div className="text-xl text-center mb-8 neon-text-cyan">
        Welcome back, {username}!
      </div>

      <form className="flex justify-center mb-16" onSubmit={onCreateGame}>
        <Button
          disabled={!username.trim() || isCreatingGame}
          variant="outline"
          size="icon"
          type="submit"
          className="rounded-full w-16 h-16 border-cyan-500 text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-400 hover:text-cyan-300 focus:text-cyan-300 focus:bg-cyan-900/30 active:bg-cyan-900/50 active:scale-95 transition-all duration-200 neon-border"
          aria-label="Play game"
        >
          {isCreatingGame ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Play className="h-8 w-8" />
          )}
        </Button>
      </form>

      <div className="mb-20">
        <GameTabs />
      </div>
    </div>
  );
};
