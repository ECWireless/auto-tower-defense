import { useEntityQuery } from '@latticexyz/react';
import { Entity, getComponentValueStrict, Has } from '@latticexyz/recs';
import { decodeEntity, encodeEntity } from '@latticexyz/store-sync/recs';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Trophy,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Address } from 'viem';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import useCopy from '@/hooks/useCopy';
import { useMUD } from '@/MUDContext';
import { GAMES_PATH } from '@/Routes';
import {
  formatDateFromTimestamp,
  formatTimeFromTimestamp,
  getElapsedTime,
  shortenAddress,
} from '@/utils/helpers';
import { type Game } from '@/utils/types';

const ActiveGameCard = ({
  game,
  onClick,
}: {
  game: Game;
  onClick: () => void;
}) => {
  return (
    <Card
      className="bg-black border-gray-800 cursor-pointer hover:bg-gray-900 mb-3"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-1 items-center">
            <Calendar className="h-3 mr-1 text-gray-400 w-3" />
            <span className="text-sm text-white">
              {formatDateFromTimestamp(game.startTimestamp)}
            </span>
          </div>
          <ArrowRight className="h-4 text-gray-400 w-4" />
        </div>

        <div className="flex justify-between mb-2">
          <div className="flex gap-1 items-center">
            <Clock className="h-3 mr-1 text-gray-400 w-3" />
            <span className="text-sm text-white">
              {formatTimeFromTimestamp(game.startTimestamp)} •{' '}
              {getElapsedTime(
                game.startTimestamp,
                BigInt(BigInt(Math.floor(Date.now() / 1000))),
              )}{' '}
              elapsed
            </span>
          </div>
        </div>

        <div className="flex gap-1 items-center mb-2">
          <Users className="h-3 mr-1 text-gray-400 w-3" />
          <div className="text-sm text-white">
            <span>{game.player1Username}</span>
            {game.turn === game.player1Address && (
              <Badge
                className="border-green-500 h-4 ml-1 px-1 text-green-500 text-xs"
                variant="outline"
              >
                Turn
              </Badge>
            )}
            <span className="mx-1">vs</span>
            <span>{game.player2Username}</span>
            {game.turn === game.player2Address && (
              <Badge
                className="border-green-500 h-4 ml-1 px-1 text-green-500 text-xs"
                variant="outline"
              >
                Turn
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-1 items-center">
          <span className="text-sm text-white">Round {game.roundCount}</span>
        </div>
      </CardContent>
    </Card>
  );
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
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-1 items-center">
            <Calendar className="h-3 mr-1 text-gray-400 w-3" />
            <span className="text-sm text-white">
              {formatDateFromTimestamp(game.startTimestamp)}
            </span>
          </div>
          <ArrowRight className="h-4 text-gray-400 w-4" />
        </div>

        <div className="flex justify-between mb-2">
          <div className="flex  gap-1 items-center">
            <Clock className="h-3 mr-1 text-gray-400 w-3" />
            <span className="text-sm text-white">
              {formatTimeFromTimestamp(game.startTimestamp)} •{' '}
              {getElapsedTime(game.startTimestamp, game.endTimestamp)}
            </span>
          </div>
        </div>

        <div className="flex gap-1 items-center mb-2">
          <Users className="h-3 mr-1 text-gray-400 w-3" />
          <span className="text-sm text-white">
            {game.player1Username} vs {game.player2Username}
          </span>
        </div>

        <div className="flex gap-1 items-center">
          <Trophy className="h-3 mr-1 text-gray-400 w-3" />
          <span className="font-medium text-sm text-white">
            {game.winner === game.player1Address
              ? game.player1Username
              : game.player2Username}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const HomeTabs: React.FC = () => {
  const navigate = useNavigate();
  const { copiedText, copyToClipboard } = useCopy();
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

  const activeGames = useMemo(
    () =>
      games
        .filter(game => game.endTimestamp === BigInt(0))
        .sort((a, b) => Number(b.startTimestamp) - Number(a.startTimestamp)),
    [games],
  );

  const completedGames = useMemo(
    () =>
      games
        .filter(game => game.endTimestamp !== BigInt(0))
        .sort((a, b) => Number(b.endTimestamp) - Number(a.endTimestamp)),
    [games],
  );

  return (
    <div className="max-w-2xl mx-auto w-full">
      <Tabs className="w-full" defaultValue="leaderboard">
        <TabsList className="bg-transparent grid grid-cols-3 w-full">
          <TabsTrigger
            className="data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:rounded-none data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 hover:cursor-pointer hover:text-cyan-300 text-gray-400 sm:text-sm text-xs"
            value="leaderboard"
          >
            Leaderboard ({leaderboardList.length})
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:rounded-none data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 hover:cursor-pointer hover:text-cyan-300 text-gray-400 sm:text-sm text-xs"
            value="active"
          >
            Active ({activeGames.length})
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:rounded-none data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 hover:cursor-pointer hover:text-cyan-300 text-gray-400 sm:text-sm text-xs"
            value="completed"
          >
            Completed ({completedGames.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="leaderboard">
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
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{player.username}</TableCell>
                      <TableCell>{player.level}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{shortenAddress(player.address)}</span>
                          <Tooltip>
                            <TooltipTrigger
                              className="h-6 hover:cursor-pointer hover:text-white text-gray-400 w-6"
                              onClick={() => copyToClipboard(player.address)}
                            >
                              {copiedText === player.address ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {copiedText === player.address
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
                  className="bg-gray-900 border-gray-800 hover:border-cyan-900 mb-3"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="gap-2 flex items-center">
                        <span className="font-medium text-white">#{i + 1}</span>
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
                        className="h-6 hover:text-white text-gray-400 w-6"
                        onClick={() => copyToClipboard(player.address)}
                        size="icon"
                        variant="ghost"
                      >
                        {copiedText === player.address ? (
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
                  <TableHead className="text-white">Round</TableHead>
                  <TableHead className="text-white w-10" />
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
                      <div className="flex gap-1 items-center">
                        <Clock className="h-3 text-gray-400 w-3" />
                        <span>
                          {getElapsedTime(
                            game.startTimestamp,
                            BigInt(Math.floor(Date.now() / 1000)),
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex gap-2 items-center">
                          <span>{game.player1Username}</span>
                          {game.turn === game.player1Address && (
                            <Badge
                              className="border-green-500 h-5 px-1 text-green-500 text-xs"
                              variant="outline"
                            >
                              Turn
                            </Badge>
                          )}
                        </div>
                        <span className="text-gray-400">vs</span>
                        <div className="flex gap-2 items-center">
                          <span>{game.player2Username}</span>
                          {game.turn === game.player2Address && (
                            <Badge
                              className="border-green-500 h-5 px-1 text-green-500 text-xs"
                              variant="outline"
                            >
                              Turn
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{game.roundCount}</TableCell>
                    <TableCell className="text-right">
                      <ArrowRight className="h-4 ml-auto text-gray-400 w-4" />
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
                  <TableHead className="text-white w-10" />
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
                      <div className="flex gap-1 items-center">
                        <Clock className="h-3 text-gray-400 w-3" />
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
                      <ArrowRight className="h-4 ml-auto text-gray-400 w-4" />
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
