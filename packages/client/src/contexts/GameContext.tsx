import { useEntityQuery } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
  Has,
  HasValue,
  runQuery,
} from '@latticexyz/recs';
import { decodeEntity, encodeEntity } from '@latticexyz/store-sync/recs';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { Address, zeroAddress, zeroHash } from 'viem';

import { useMUD } from '@/MUDContext';
import { MAX_TICKS } from '@/utils/constants';
import type { Castle, Game, Tower } from '@/utils/types';

type GameContextType = {
  activeTowerId: string | null;
  allowDrop: (e: React.DragEvent) => void;
  enemyCastlePosition: Castle;
  game: Game | null;
  handleDragStart: (
    e: React.DragEvent,
    towerId: string,
    type: 'offense' | 'defense',
  ) => void;
  handleTowerSelect: (towerId: string, type: 'offense' | 'defense') => void;
  installingPosition: { x: number; y: number } | null;
  isChangingTurn: boolean;
  isInstallingTower: boolean;
  isPlayer1: boolean;
  isRefreshing: boolean;
  myCastlePosition: Castle;
  onInstallTower: (
    e: React.DragEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    row: number,
    col: number,
  ) => void;
  onMoveTower: (
    e: React.DragEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
    row: number,
    col: number,
  ) => void;
  onNextTurn: () => void;
  refreshGame: () => void;
  setTowers: (towers: Tower[]) => void;
  setTriggerAnimation: (value: boolean) => void;
  tickCount: number;
  towers: Tower[];
  triggerAnimation: boolean;
};

const GameContext = createContext<GameContextType>({
  activeTowerId: null,
  allowDrop: () => {},
  enemyCastlePosition: {
    id: zeroHash as Entity,
    currentHealth: 0,
    maxHealth: 0,
    x: 0,
    y: 0,
  },
  game: null,
  handleDragStart: () => {},
  handleTowerSelect: () => {},
  isChangingTurn: false,
  installingPosition: null,
  isInstallingTower: false,
  isPlayer1: false,
  isRefreshing: false,
  myCastlePosition: {
    id: zeroHash as Entity,
    currentHealth: 0,
    maxHealth: 0,
    x: 0,
    y: 0,
  },
  onInstallTower: () => {},
  onMoveTower: () => {},
  onNextTurn: () => {},
  refreshGame: async () => {},
  setTowers: () => {},
  setTriggerAnimation: () => {},
  tickCount: 0,
  towers: [],
  triggerAnimation: false,
});

export type GameProviderProps = {
  children: ReactNode;
  gameId: Entity;
};

export const GameProvider = ({
  children,
  gameId,
}: GameProviderProps): JSX.Element => {
  const {
    components: {
      Castle,
      CurrentGame,
      Game: GameComponent,
      Health,
      Level,
      Owner,
      Position,
      Projectile,
      ProjectileTrajectory,
      Tower,
      Username,
    },
    network: { playerEntity },
    systemCalls: { installTower, moveTower, nextTurn },
  } = useMUD();

  const [game, setGame] = useState<Game | null>(null);
  const [isLoadingGame, setIsLoadingGame] = useState(true);

  const [activeTowerId, setActiveTowerId] = useState<string | null>(null);
  const [isInstallingTower, setIsInstallingTower] = useState(false);
  const [installingPosition, setInstallingPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activePiece, setActivePiece] = useState<
    'offense' | 'defense' | 'none'
  >('none');

  const [towers, setTowers] = useState<Tower[]>([]);
  const [isChangingTurn, setIsChangingTurn] = useState(false);

  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [tickCount, setTickCount] = useState(0);

  const myCastlePosition = useEntityQuery([
    Has(Castle),
    HasValue(CurrentGame, { value: game?.id }),
    HasValue(Owner, { value: game?.player1Address }),
  ]).map(entity => {
    const _myCastlePosition = getComponentValueStrict(Position, entity);
    const _myCastleHealth = getComponentValueStrict(Health, entity);
    return {
      id: entity,
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
      id: entity,
      currentHealth: _enemyCastleHealth.currentHealth,
      maxHealth: _enemyCastleHealth.maxHealth,
      x: _enemyCastlePosition.x,
      y: _enemyCastlePosition.y,
    };
  })[0];

  const fetchGame = useCallback(() => {
    if (!gameId) return;
    const _game = getComponentValue(GameComponent, gameId as Entity);
    if (_game) {
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
      const _level =
        getComponentValue(Level, gameId as Entity)?.value ?? BigInt(0);

      setGame({
        id: gameId,
        actionCount: _game.actionCount,
        endTimestamp: _game.endTimestamp,
        level: _level,
        player1Address: _game.player1Address as Address,
        player1Username: _player1Username,
        player2Address: _game.player2Address as Address,
        player2Username: _player2Username,
        roundCount: _game.roundCount,
        startTimestamp: _game.startTimestamp,
        turn: _game.turn as Address,
        winner: _game.winner as Address,
      });

      const _towers = Array.from(
        runQuery([Has(Tower), HasValue(CurrentGame, { value: gameId })]),
      ).map(entity => {
        const health = getComponentValueStrict(Health, entity);
        const owner = getComponentValueStrict(Owner, entity).value;
        const position = getComponentValueStrict(Position, entity);
        const projectileTrajectoryUnformatted = getComponentValue(
          ProjectileTrajectory,
          entity,
        );

        const projectileTrajectory = [];
        if (projectileTrajectoryUnformatted) {
          for (let i = 0; i < projectileTrajectoryUnformatted.x.length; i++) {
            projectileTrajectory.push({
              x: projectileTrajectoryUnformatted.x[i],
              y: projectileTrajectoryUnformatted.y[i],
            });
          }
        }

        return {
          id: entity,
          currentHealth: health.currentHealth,
          maxHealth: health.maxHealth,
          owner: owner as Address,
          projectileLogicAddress: (getComponentValue(Projectile, entity)
            ?.logicAddress ?? zeroAddress) as Address,
          projectileTrajectory,
          x: position.x,
          y: position.y,
        };
      });
      setTowers(_towers.filter(tower => tower.currentHealth > 0));
    }
    setIsLoadingGame(false);
  }, [
    CurrentGame,
    GameComponent,
    gameId,
    Health,
    Level,
    Owner,
    Position,
    Projectile,
    ProjectileTrajectory,
    Tower,
    Username,
  ]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const onInstallTower = useCallback(
    async (
      e: React.DragEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
      row: number,
      col: number,
    ) => {
      e.preventDefault();
      try {
        setIsInstallingTower(true);
        setInstallingPosition({ x: col, y: row });

        if (activeTowerId?.startsWith('0x')) {
          throw new Error('Installed tower selected. Please move it instead.');
        }

        if (!game) {
          throw new Error('Game not found.');
        }

        const hasProjectile = activePiece === 'offense';

        const { error, success } = await installTower(
          game.id,
          hasProjectile,
          col * 10,
          row * 10,
        );

        if (error && !success) {
          throw new Error(error);
        }

        toast.success('Tower Installed!');

        fetchGame();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        toast.error('Error Installing Tower', {
          description: (error as Error).message,
        });
      } finally {
        setIsInstallingTower(false);
        setInstallingPosition(null);
        setActiveTowerId(null);
      }
    },
    [activePiece, activeTowerId, game, installTower, fetchGame],
  );

  const onMoveTower = useCallback(
    async (
      e: React.DragEvent | React.MouseEvent<HTMLDivElement, MouseEvent>,
      row: number,
      col: number,
    ) => {
      e.preventDefault();
      try {
        setIsInstallingTower(true);
        setInstallingPosition({ x: col, y: row });

        if (!activeTowerId?.startsWith('0x')) {
          throw new Error('No active tower selected.');
        }

        if (!game) {
          throw new Error('Game not found.');
        }

        const { error, success } = await moveTower(
          game.id,
          activeTowerId,
          col * 10,
          row * 10,
        );

        if (error && !success) {
          throw new Error(error);
        }

        toast.success('Tower Moved!');

        fetchGame();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        toast.error('Error Moving Tower', {
          description: (error as Error).message,
        });
      } finally {
        setIsInstallingTower(false);
        setInstallingPosition(null);
        setActiveTowerId(null);
      }
    },
    [activeTowerId, game, moveTower, fetchGame],
  );

  const allowDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, towerId: string, type: 'offense' | 'defense') => {
      setActiveTowerId(towerId);
      setActivePiece(type);
      e.dataTransfer.setData('text/plain', 'piece'); // Arbitrary data to identify the piece
    },
    [],
  );

  const handleTowerSelect = useCallback(
    (towerId: string, type: 'offense' | 'defense') => {
      setActiveTowerId(prev => (prev === towerId ? null : towerId));
      setActivePiece(type);
    },
    [],
  );

  const onNextRound = useCallback(async () => {
    try {
      setIsChangingTurn(true);

      if (!game) {
        throw new Error('Game not found.');
      }
      const { error, success } = await nextTurn(game.id);

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Turn Changed!');

      setTriggerAnimation(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Changing Turn', {
        description: (error as Error).message,
      });
    } finally {
      setIsChangingTurn(false);
    }
  }, [game, nextTurn, setTriggerAnimation]);

  const onNextTurn = useCallback(async () => {
    try {
      setIsChangingTurn(true);

      if (!game) {
        throw new Error('Game not found.');
      }

      if (game.turn === game.player2Address) {
        await onNextRound();
        return;
      }

      const { error, success } = await nextTurn(game.id);

      if (error && !success) {
        throw new Error(error);
      }

      fetchGame();
      await onNextRound();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Changing Turn', {
        description: (error as Error).message,
      });
    } finally {
      setIsChangingTurn(false);
    }
  }, [fetchGame, game, nextTurn, onNextRound]);

  useEffect(() => {
    if (!game) return () => {};
    if (game.turn !== game.player2Address) return () => {};
    if (!triggerAnimation) return () => {};

    const _towers = Array.from(
      runQuery([Has(Tower), HasValue(CurrentGame, { value: game.id })]),
    ).map(entity => {
      const projectileTrajectoryUnformatted = getComponentValue(
        ProjectileTrajectory,
        entity,
      );

      const projectileTrajectory = [];
      if (projectileTrajectoryUnformatted) {
        for (let i = 0; i < projectileTrajectoryUnformatted.x.length; i++) {
          projectileTrajectory.push({
            x: projectileTrajectoryUnformatted.x[i],
            y: projectileTrajectoryUnformatted.y[i],
          });
        }
      }

      return {
        id: entity,
        projectileTrajectory,
      };
    });

    setTowers(prev => {
      const _test = prev.map(tower => {
        const towerWithNewProjectile = _towers.find(
          newTower => newTower.id === tower.id,
        );
        if (towerWithNewProjectile) {
          return {
            ...tower,
            projectileTrajectory: towerWithNewProjectile.projectileTrajectory,
          };
        }
        return tower;
      });
      return _test;
    });

    let _tickCount = 0;
    const interval = setInterval(() => {
      if (_tickCount >= MAX_TICKS - 1) {
        setTriggerAnimation(false);
        setTickCount(0);
        fetchGame();
        return;
      }
      _tickCount += 1;
      setTickCount(prev => (prev + 1) % MAX_TICKS);
    }, 50);
    return () => clearInterval(interval);
  }, [
    CurrentGame,
    fetchGame,
    game,
    Health,
    Position,
    Projectile,
    ProjectileTrajectory,
    Owner,
    Tower,
    triggerAnimation,
  ]);

  const isPlayer1 = useMemo(() => {
    if (!(game && playerEntity)) return false;
    const playerAddress = decodeEntity(
      {
        address: 'address',
      },
      playerEntity,
    ).address;

    return playerAddress === game?.player1Address;
  }, [game, playerEntity]);

  return (
    <GameContext.Provider
      value={{
        activeTowerId,
        allowDrop,
        enemyCastlePosition,
        game,
        handleDragStart,
        handleTowerSelect,
        installingPosition,
        isChangingTurn,
        isInstallingTower,
        isPlayer1,
        isRefreshing: isLoadingGame,
        myCastlePosition,
        onInstallTower,
        onMoveTower,
        onNextTurn,
        refreshGame: fetchGame,
        setTowers,
        setTriggerAnimation,
        tickCount,
        towers,
        triggerAnimation,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => useContext(GameContext);
