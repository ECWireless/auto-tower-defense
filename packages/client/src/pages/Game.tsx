import { Box, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { useEntityQuery } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
  Has,
  HasValue,
} from '@latticexyz/recs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BiSolidCastle } from 'react-icons/bi';
import { FaInfoCircle, FaPlay } from 'react-icons/fa';
import { GiStoneTower } from 'react-icons/gi';
import { useParams } from 'react-router-dom';
import { Address, zeroAddress, zeroHash } from 'viem';

import { StatsPanel } from '../components/StatsPanel';
import { Button } from '../components/ui/button';
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
} from '../components/ui/drawer';
import { toaster } from '../components/ui/toaster';
import { Tooltip } from '../components/ui/tooltip';
import { useMUD } from '../MUDContext';
import { type Game, type Tower } from '../utils/types';

export const GamePage = (): JSX.Element => {
  const { id } = useParams();
  const {
    components: {
      Castle,
      CurrentGame,
      Game: GameComponent,
      Health,
      Owner,
      Position,
      Projectile,
      Tower,
    },
    systemCalls: { installTower, moveTower, nextTurn },
  } = useMUD();

  const [game, setGame] = useState<Game | null>(null);
  const [isLoadingGame, setIsLoadingGame] = useState(true);

  const [activeTowerId, setActiveTowerId] = useState<string>(zeroHash);
  const [isInstallingTower, setIsInstallingTower] = useState(false);
  const [installingPosition, setInstallingPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activePiece, setActivePiece] = useState<
    'offense' | 'defense' | 'none'
  >('none');

  const [isChangingTurn, setIsChangingTurn] = useState(false);

  const [isSystemDrawerOpen, setIsSystemDrawerOpen] = useState(false);

  const myCastlePosition = useEntityQuery([
    Has(Castle),
    HasValue(CurrentGame, { value: game?.id }),
    HasValue(Owner, { value: game?.player1Address }),
  ]).map(entity => {
    const _myCastlePosition = getComponentValueStrict(Position, entity);
    const _myCastleHealth = getComponentValueStrict(Health, entity);
    return {
      currentHealth: _myCastleHealth.currentHealth,
      maxHealth: _myCastleHealth.maxHealth,
      x: _myCastlePosition.x,
      y: _myCastlePosition.y,
    };
  })[0];

  const enemyCastlePosition = useEntityQuery([
    Has(Castle),
    HasValue(CurrentGame, { value: game?.id }),
    HasValue(Owner, { value: game?.player2Address }),
  ]).map(entity => {
    const _enemyCastlePosition = getComponentValueStrict(Position, entity);
    const _enemyCastleHealth = getComponentValueStrict(Health, entity);
    return {
      currentHealth: _enemyCastleHealth.currentHealth,
      maxHealth: _enemyCastleHealth.maxHealth,
      x: _enemyCastlePosition.x,
      y: _enemyCastlePosition.y,
    };
  })[0];

  const towers: Tower[] = useEntityQuery([
    Has(Tower),
    HasValue(CurrentGame, { value: game?.id }),
  ]).map(entity => {
    const position = getComponentValueStrict(Position, entity);
    const health = getComponentValueStrict(Health, entity);
    return {
      id: entity,
      currentHealth: health.currentHealth,
      maxHealth: health.maxHealth,
      projectile: !!getComponentValue(Projectile, entity),
      x: position.x,
      y: position.y,
    };
  });

  const fetchGame = useCallback(async () => {
    if (!id) return;
    const _game = getComponentValue(GameComponent, id as Entity);
    if (_game) {
      setGame({
        id,
        actionCount: _game.actionCount,
        endTimestamp: _game.endTimestamp,
        player1Address: _game.player1Address as Address,
        player2Address: _game.player2Address as Address,
        roundCount: _game.roundCount,
        startTimestamp: _game.startTimestamp,
        turn: _game.turn as Address,
      });
    }
    setIsLoadingGame(false);
  }, [GameComponent, id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const onInstallTower = useCallback(
    async (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      try {
        setIsInstallingTower(true);
        setInstallingPosition({ x: col, y: row });

        if (activeTowerId !== zeroHash) {
          throw new Error('Active tower selected. Please move it instead.');
        }

        if (!game) {
          throw new Error('Game not found.');
        }

        const hasProjectile = activePiece === 'offense';

        const { error, success } = await installTower(
          game.id,
          hasProjectile,
          col,
          row,
        );

        if (error && !success) {
          throw new Error(error);
        }

        toaster.create({
          title: 'Tower Installed!',
          type: 'success',
        });

        fetchGame();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        toaster.create({
          description: (error as Error).message,
          title: 'Error Installing Tower',
          type: 'error',
        });
      } finally {
        setIsInstallingTower(false);
        setInstallingPosition(null);
      }
    },
    [activePiece, activeTowerId, fetchGame, game, installTower],
  );

  const onMoveTower = useCallback(
    async (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      try {
        setIsInstallingTower(true);
        setInstallingPosition({ x: col, y: row });

        if (activeTowerId === zeroHash) {
          throw new Error('No active tower selected.');
        }

        if (!game) {
          throw new Error('Game not found.');
        }

        const { error, success } = await moveTower(
          game.id,
          activeTowerId,
          col,
          row,
        );

        if (error && !success) {
          throw new Error(error);
        }

        toaster.create({
          title: 'Tower Moved!',
          type: 'success',
        });

        fetchGame();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        toaster.create({
          description: (error as Error).message,
          title: 'Error Moving Tower',
          type: 'error',
        });
      } finally {
        setIsInstallingTower(false);
        setInstallingPosition(null);
      }
    },
    [activeTowerId, fetchGame, game, moveTower],
  );

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (
    e: React.DragEvent,
    towerId: string,
    type: 'offense' | 'defense',
  ) => {
    setActiveTowerId(towerId);
    setActivePiece(type);
    e.dataTransfer.setData('text/plain', 'piece'); // Arbitrary data to identify the piece
  };

  const onNextTurn = useCallback(async () => {
    try {
      setIsChangingTurn(true);

      if (!game) {
        throw new Error('Game not found.');
      }

      const { error, success } = await nextTurn(game.id);

      if (error && !success) {
        throw new Error(error);
      }

      toaster.create({
        title: 'Turn Changed!',
        type: 'success',
      });

      fetchGame();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toaster.create({
        description: (error as Error).message,
        title: 'Error Changing Turn',
        type: 'error',
      });
    } finally {
      setIsChangingTurn(false);
    }
  }, [fetchGame, game, nextTurn]);

  const canChangeTurn = useMemo(() => {
    if (!game) return false;
    if (game.turn === zeroAddress) return true;
    return game.turn === game.player1Address && game.actionCount === 0;
  }, [game]);

  if (isLoadingGame) {
    return (
      <VStack h="100vh" justifyContent="center">
        <Spinner borderWidth="4px" size="xl" />
      </VStack>
    );
  }

  if (!game) {
    return (
      <VStack h="100vh" justifyContent="center">
        <Text fontSize="3xl" fontWeight={700} textTransform="uppercase">
          Game not found
        </Text>
      </VStack>
    );
  }

  return (
    <DrawerRoot
      onOpenChange={e => setIsSystemDrawerOpen(e.open)}
      open={isSystemDrawerOpen}
      size="lg"
    >
      <VStack h="100vh" justifyContent="center" p={6}>
        <DrawerBackdrop />
        <DrawerContent bgColor="white">
          <DrawerCloseTrigger bgColor="black" />
          <DrawerHeader>
            <DrawerTitle color="black" textTransform="uppercase">
              System Modification
            </DrawerTitle>
          </DrawerHeader>
          <DrawerBody />
          <DrawerFooter />
        </DrawerContent>
        <Box>
          <StatsPanel game={game} />
          <Box>
            <HStack alignItems="stretch" gap={2} h="100%">
              <Box bgColor="white" display="flex" w={120}>
                <Box borderRight="2px solid black" h="100%" w="50%">
                  <VStack
                    borderBottom="2px solid black"
                    h={16}
                    justifyContent="center"
                  >
                    <Tooltip
                      closeDelay={200}
                      content="Offensive Tower"
                      openDelay={200}
                    >
                      <Box
                        draggable="true"
                        onDragStart={e =>
                          handleDragStart(e, zeroHash, 'offense')
                        }
                      >
                        <GiStoneTower color="blue" size={20} />
                      </Box>
                    </Tooltip>
                  </VStack>
                </Box>
                <Box h="100%" w="50%">
                  <VStack
                    borderBottom="2px solid black"
                    h={16}
                    justifyContent="center"
                  >
                    <Tooltip
                      closeDelay={200}
                      content="Defensive Tower"
                      openDelay={200}
                    >
                      <Box
                        draggable="true"
                        onDragStart={e =>
                          handleDragStart(e, zeroHash, 'defense')
                        }
                      >
                        <GiStoneTower color="red" size={20} />
                      </Box>
                    </Tooltip>
                  </VStack>
                </Box>
              </Box>

              <Box
                display="grid"
                gridTemplateColumns="repeat(14, 1fr)"
                gridTemplateRows="repeat(7, 1fr)"
                h="300px"
                w="600px"
              >
                {Array.from({ length: 98 }).map((_, index) => {
                  const row = Math.floor(index / 14);
                  const col = index % 14;
                  const isMiddleLine = index % 14 === 7;

                  const myCastle =
                    row === myCastlePosition?.y && col === myCastlePosition?.x;
                  const enemyCastle =
                    row === enemyCastlePosition?.y &&
                    col === enemyCastlePosition?.x;

                  const isEnemyTile = col > 6;

                  const activeTower = towers.find(
                    tower => tower.x === col && tower.y === row,
                  );

                  const canInstall =
                    !activeTower && !myCastle && !enemyCastle && !isEnemyTile;

                  const isInstalling =
                    !!(
                      installingPosition?.x === col &&
                      installingPosition?.y === row
                    ) && isInstallingTower;

                  return (
                    <Box
                      bg="green.400"
                      border="1px solid black"
                      borderLeft={isMiddleLine ? '2px solid black' : 'none'}
                      h="100%"
                      key={index}
                      onDrop={e =>
                        activeTowerId === zeroHash
                          ? onInstallTower(e, row, col)
                          : onMoveTower(e, row, col)
                      }
                      onDragOver={canInstall ? allowDrop : undefined}
                      w="100%"
                    >
                      {isInstalling && (
                        <Box
                          alignItems="center"
                          color="white"
                          display="flex"
                          h="100%"
                          justifyContent="center"
                          w="100%"
                        >
                          <Spinner borderWidth="2px" size="sm" />
                        </Box>
                      )}

                      {!!activeTower && (
                        <Box
                          alignItems="center"
                          color="white"
                          display="flex"
                          h="100%"
                          justifyContent="center"
                          w="100%"
                        >
                          <Tooltip
                            closeDelay={200}
                            content={`${
                              activeTower.projectile
                                ? 'Offensive Tower'
                                : 'Defensive Tower'
                            } - Health: ${activeTower.currentHealth}/${activeTower.maxHealth}`}
                            openDelay={200}
                          >
                            <Box
                              draggable="true"
                              onClick={() => setIsSystemDrawerOpen(true)}
                              onDragStart={e =>
                                handleDragStart(
                                  e,
                                  activeTower.id,
                                  activeTower.projectile
                                    ? 'offense'
                                    : 'defense',
                                )
                              }
                            >
                              <GiStoneTower
                                color={activeTower.projectile ? 'blue' : 'red'}
                                size={20}
                              />
                            </Box>
                          </Tooltip>
                        </Box>
                      )}

                      {myCastle && (
                        <Tooltip
                          closeDelay={200}
                          content={`Your Castle - Health: ${myCastlePosition?.currentHealth}/${myCastlePosition?.maxHealth}`}
                          openDelay={200}
                        >
                          <Box
                            alignItems="center"
                            color="white"
                            display="flex"
                            h="100%"
                            justifyContent="center"
                            w="100%"
                          >
                            <BiSolidCastle color="yellow" size={20} />
                          </Box>
                        </Tooltip>
                      )}

                      {enemyCastle && (
                        <Tooltip
                          closeDelay={200}
                          content={`Enemy Castle - Health: ${enemyCastlePosition?.currentHealth}/${enemyCastlePosition?.maxHealth}`}
                          openDelay={200}
                        >
                          <Box
                            alignItems="center"
                            color="white"
                            display="flex"
                            h="100%"
                            justifyContent="center"
                            w="100%"
                          >
                            <BiSolidCastle color="yellow" size={20} />
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  );
                })}
              </Box>
              <VStack bgColor="white" color="black" p={2} w={120}>
                <HStack justifyContent="center">
                  <Text fontSize="sm">NEXT</Text>
                  <Button
                    loading={isChangingTurn}
                    onClick={onNextTurn}
                    p={0}
                    variant="ghost"
                    _hover={{
                      bgColor: 'gray.200',
                    }}
                    _disabled={{
                      bgColor: 'gray.500',
                    }}
                  >
                    <FaPlay color={canChangeTurn ? 'green' : 'black'} />
                  </Button>
                </HStack>
                <HStack justifyContent="center">
                  <Text fontSize="sm">TIMER</Text>
                  <Text fontWeight={900}>5:00</Text>
                </HStack>
                <DialogRoot>
                  <DialogBackdrop />
                  <DialogTrigger
                    as={Button}
                    _hover={{
                      bgColor: 'gray.200',
                    }}
                  >
                    <FaInfoCircle color="black" />
                  </DialogTrigger>
                  <DialogContent bgColor="white" color="black">
                    <DialogCloseTrigger bgColor="black" />
                    <DialogHeader>
                      <DialogTitle textTransform="uppercase">
                        How to Play
                      </DialogTitle>
                    </DialogHeader>
                    <DialogBody>Just start clicking around!</DialogBody>
                    <DialogFooter />
                  </DialogContent>
                </DialogRoot>
              </VStack>
            </HStack>
          </Box>
        </Box>
      </VStack>
    </DrawerRoot>
  );
};
