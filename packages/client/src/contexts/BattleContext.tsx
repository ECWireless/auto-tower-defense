import { useComponentValue, useEntityQuery } from '@latticexyz/react';
import {
  Entity,
  getComponentValue,
  getComponentValueStrict,
  Has,
  HasValue,
  runQuery,
} from '@latticexyz/recs';
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

import { useSettings } from '@/contexts/SettingsContext';
import { useMUD } from '@/hooks/useMUD';
import { MAX_TICKS } from '@/utils/constants';
import type { Battle, Castle, Tower } from '@/utils/types';

export const NO_ACTIONS_ERROR = 'TowerSystem: player has no actions remaining';

type BattleContextType = {
  activeTowerId: string | null;
  battle: Battle | null;
  enemyCastlePosition: Castle;
  handleDragStart: (towerId: string, type: 'offense' | 'defense') => void;
  handleTowerSelect: (towerId: string, type: 'offense' | 'defense') => void;
  installingPosition: { x: number; y: number } | null;
  isCastleHitDialogOpen: boolean;
  isChangingTurn: boolean;
  isInstallingTower: boolean;
  isMyCastleHit: boolean;
  isNoActionsDialogOpen: boolean;
  isPlayer1: boolean;
  isRefreshing: boolean;
  isUndoing: boolean;
  myCastlePosition: Castle;
  onInstallTower: (row: number, col: number) => void;
  onMoveTower: (row: number, col: number) => void;
  onNextTurn: () => Promise<void>;
  onUndoAction: () => Promise<void>;
  refreshBattle: () => void;
  setIsCastleHitDialogOpen: (isOpen: boolean) => void;
  setIsNoActionsDialogOpen: (isOpen: boolean) => void;
  setTowers: (towers: Tower[]) => void;
  setTriggerAnimation: (value: boolean) => void;
  tickCount: number;
  towers: Tower[];
  triggerAnimation: boolean;
};

const BattleContext = createContext<BattleContextType>({
  activeTowerId: null,
  battle: null,
  enemyCastlePosition: {
    id: zeroHash as Entity,
    currentHealth: 0,
    maxHealth: 0,
    x: 0,
    y: 0,
  },
  handleDragStart: () => {},
  handleTowerSelect: () => {},
  installingPosition: null,
  isCastleHitDialogOpen: false,
  isChangingTurn: false,
  isInstallingTower: false,
  isMyCastleHit: false,
  isNoActionsDialogOpen: false,
  isPlayer1: false,
  isRefreshing: false,
  isUndoing: false,
  myCastlePosition: {
    id: zeroHash as Entity,
    currentHealth: 0,
    maxHealth: 0,
    x: 0,
    y: 0,
  },
  onInstallTower: () => {},
  onMoveTower: () => {},
  onNextTurn: async () => {},
  onUndoAction: async () => {},
  refreshBattle: async () => {},
  setIsCastleHitDialogOpen: () => {},
  setIsNoActionsDialogOpen: () => {},
  setTowers: () => {},
  setTriggerAnimation: () => {},
  tickCount: 0,
  towers: [],
  triggerAnimation: false,
});

export type BattleProviderProps = {
  children: ReactNode;
  battleId: Entity;
};

export const BattleProvider = ({
  children,
  battleId,
}: BattleProviderProps): JSX.Element => {
  const {
    components: {
      Battle: BattleComponent,
      Castle,
      CurrentBattle,
      Health,
      Level,
      Owner,
      Position,
      Projectile,
      ProjectileTrajectory,
      Tower,
      TutorialProgress,
      Username,
    },
    network: { globalPlayerId },
    systemCalls: {
      completeTutorialStep,
      installTower,
      moveTower,
      nextTurn,
      undoAction,
    },
  } = useMUD();
  const { playSfx } = useSettings();
  const tutorialProgress = useComponentValue(TutorialProgress, globalPlayerId);

  const [battle, setBattle] = useState<Battle | null>(null);
  const [isLoadingBattle, setIsLoadingBattle] = useState(true);

  const [activeTowerId, setActiveTowerId] = useState<string | null>(null);
  const [isInstallingTower, setIsInstallingTower] = useState(false);
  const [installingPosition, setInstallingPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activePiece, setActivePiece] = useState<
    'offense' | 'defense' | 'none'
  >('none');

  const [isNoActionsDialogOpen, setIsNoActionsDialogOpen] = useState(false);
  const [isCastleHitDialogOpen, setIsCastleHitDialogOpen] = useState(false);
  const [isMyCastleHit, setIsMyCastleHit] = useState(false);

  const [towers, setTowers] = useState<Tower[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isChangingTurn, setIsChangingTurn] = useState(false);

  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [tickCount, setTickCount] = useState(0);

  const myCastlePosition = useEntityQuery([
    Has(Castle),
    HasValue(CurrentBattle, { value: battle?.id }),
    HasValue(Owner, { value: battle?.player1Id }),
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
    HasValue(CurrentBattle, { value: battle?.id }),
    HasValue(Owner, { value: battle?.player2Id }),
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

  const fetchBattle = useCallback(() => {
    if (!battleId) return;
    const _battle = getComponentValue(BattleComponent, battleId as Entity);
    if (_battle) {
      const _player1Username = getComponentValueStrict(
        Username,
        _battle.player1Id as Entity,
      ).value;
      const _player2Username = getComponentValueStrict(
        Username,
        _battle.player2Id as Entity,
      ).value;
      const _level =
        getComponentValue(Level, battleId as Entity)?.value ?? BigInt(0);

      setBattle({
        id: battleId,
        actionCount: _battle.actionCount,
        endTimestamp: _battle.endTimestamp,
        level: _level,
        player1Id: _battle.player1Id as Entity,
        player1Username: _player1Username,
        player2Id: _battle.player2Id as Entity,
        player2Username: _player2Username,
        roundCount: _battle.roundCount,
        startTimestamp: _battle.startTimestamp,
        turn: _battle.turn as Entity,
        winner: _battle.winner as Entity,
      });

      const _towers = Array.from(
        runQuery([Has(Tower), HasValue(CurrentBattle, { value: battleId })]),
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
    setIsLoadingBattle(false);
  }, [
    BattleComponent,
    battleId,
    CurrentBattle,
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
    fetchBattle();
  }, [fetchBattle]);

  const onInstallTower = useCallback(
    async (row: number, col: number) => {
      try {
        setIsInstallingTower(true);
        setInstallingPosition({ x: col, y: row });
        playSfx('click2');

        if (activeTowerId?.startsWith('0x')) {
          throw new Error('Installed tower selected. Please move it instead.');
        }

        if (!battle) {
          throw new Error('Battle not found.');
        }

        const hasProjectile = activePiece === 'offense';

        const { error, success } = await installTower(
          hasProjectile,
          col * 10,
          row * 10,
        );

        if (error && !success) {
          throw new Error(error);
        }

        toast.success('Tower Installed!');

        fetchBattle();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        if (error instanceof Error && error.message === NO_ACTIONS_ERROR) {
          setIsNoActionsDialogOpen(true);
        } else {
          toast.error('Error Installing Tower', {
            description: (error as Error).message,
          });
        }
      } finally {
        setIsInstallingTower(false);
        setInstallingPosition(null);
        setActiveTowerId(null);
      }
    },
    [activePiece, activeTowerId, battle, fetchBattle, installTower, playSfx],
  );

  const onMoveTower = useCallback(
    async (row: number, col: number) => {
      try {
        setIsInstallingTower(true);
        setInstallingPosition({ x: col, y: row });
        playSfx('click2');

        if (!activeTowerId?.startsWith('0x')) {
          throw new Error('No active tower selected.');
        }

        if (!battle) {
          throw new Error('Battle not found.');
        }

        const { error, success } = await moveTower(
          activeTowerId,
          col * 10,
          row * 10,
        );

        if (error && !success) {
          throw new Error(error);
        }

        toast.success('Tower Moved!');

        fetchBattle();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Smart contract error: ${(error as Error).message}`);

        if (error instanceof Error && error.message === NO_ACTIONS_ERROR) {
          setIsNoActionsDialogOpen(true);
        } else {
          toast.error('Error Moving Tower', {
            description: (error as Error).message,
          });
        }
      } finally {
        setIsInstallingTower(false);
        setInstallingPosition(null);
        setActiveTowerId(null);
      }
    },
    [activeTowerId, battle, fetchBattle, moveTower, playSfx],
  );

  const handleDragStart = useCallback(
    (towerId: string, type: 'offense' | 'defense') => {
      playSfx('click3');
      setActiveTowerId(towerId);
      setActivePiece(type);
      // e.dataTransfer.setData('text/plain', 'piece'); // Arbitrary data to identify the piece
    },
    [playSfx],
  );

  const handleTowerSelect = useCallback(
    (towerId: string, type: 'offense' | 'defense') => {
      playSfx('click3');
      setActiveTowerId(prev => (prev === towerId ? null : towerId));
      setActivePiece(type);
    },
    [playSfx],
  );

  const onUndoAction = useCallback(async () => {
    try {
      setIsUndoing(true);
      playSfx('click3');

      const { error, success } = await undoAction();

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Action Undone!');
      fetchBattle();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Undoing Action', {
        description: (error as Error).message,
      });
    } finally {
      setIsUndoing(false);
    }
  }, [fetchBattle, playSfx, undoAction]);

  const onNextRound = useCallback(async () => {
    try {
      const originalPlayer1Castle = myCastlePosition;
      const originalPlayer2Castle = enemyCastlePosition;

      setIsChangingTurn(true);

      if (!battle) {
        throw new Error('Battle not found.');
      }
      const { error, success } = await nextTurn(battle.id);

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Turn Changed!');

      setTriggerAnimation(true);

      if (towers.some(tower => tower.projectileLogicAddress !== zeroAddress)) {
        playSfx('laserShoot');
      }

      const newPlayer1CastleHealth = getComponentValueStrict(
        Health,
        originalPlayer1Castle.id,
      );
      const newPlayer2CastleHealth = getComponentValueStrict(
        Health,
        originalPlayer2Castle.id,
      );

      if (
        newPlayer1CastleHealth.currentHealth <= 0 ||
        newPlayer2CastleHealth.currentHealth <= 0
      ) {
        return;
      }

      if (
        newPlayer1CastleHealth.currentHealth <
        originalPlayer1Castle.currentHealth
      ) {
        setIsCastleHitDialogOpen(true);
        setIsMyCastleHit(true);
        return;
      }
      if (
        newPlayer2CastleHealth.currentHealth <
        originalPlayer2Castle.currentHealth
      ) {
        setIsCastleHitDialogOpen(true);
        setIsMyCastleHit(false);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Changing Turn', {
        description: (error as Error).message,
      });
    } finally {
      setIsChangingTurn(false);
    }
  }, [
    battle,
    enemyCastlePosition,
    Health,
    myCastlePosition,
    nextTurn,
    playSfx,
    setTriggerAnimation,
    towers,
  ]);

  const onNextTurn = useCallback(async () => {
    try {
      setIsChangingTurn(true);
      playSfx('click3');

      if (!battle) {
        throw new Error('Battle not found.');
      }

      // This is purely for the sake of the tutorial
      if (
        tutorialProgress &&
        !tutorialProgress.step4Completed &&
        battle.level === BigInt(0)
      ) {
        await completeTutorialStep(3);
      }

      if (
        tutorialProgress &&
        !tutorialProgress.step4Completed &&
        battle.level === BigInt(1)
      ) {
        await completeTutorialStep(4);
      }

      if (battle.turn === battle.player1Id) {
        await onNextRound();
      }

      const newBattle = getComponentValue(BattleComponent, battle.id as Entity);
      if (newBattle && newBattle.endTimestamp === BigInt(0)) {
        const { error, success } = await nextTurn(battle.id);

        if (error && !success) {
          throw new Error(error);
        }
      } else {
        // Slight delay to allow the animation to finish
        await new Promise(resolve => setTimeout(resolve, 2500));
      }

      fetchBattle();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Changing Turn', {
        description: (error as Error).message,
      });
    } finally {
      setIsChangingTurn(false);
    }
  }, [
    battle,
    BattleComponent,
    completeTutorialStep,
    fetchBattle,
    nextTurn,
    onNextRound,
    playSfx,
    tutorialProgress,
  ]);

  useEffect(() => {
    if (!battle) return () => {};
    if (battle.turn !== battle.player1Id) return () => {};
    if (!triggerAnimation) return () => {};

    const _towers = Array.from(
      runQuery([Has(Tower), HasValue(CurrentBattle, { value: battle.id })]),
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
        fetchBattle();
        return;
      }
      _tickCount += 1;
      setTickCount(prev => (prev + 1) % MAX_TICKS);
    }, 50);
    return () => clearInterval(interval);
  }, [
    battle,
    CurrentBattle,
    fetchBattle,
    Health,
    Position,
    Projectile,
    ProjectileTrajectory,
    Owner,
    Tower,
    triggerAnimation,
  ]);

  const isPlayer1 = useMemo(
    () => globalPlayerId === battle?.player1Id,
    [battle, globalPlayerId],
  );

  return (
    <BattleContext.Provider
      value={{
        activeTowerId,
        battle,
        enemyCastlePosition,
        handleDragStart,
        handleTowerSelect,
        installingPosition,
        isCastleHitDialogOpen,
        isChangingTurn,
        isInstallingTower,
        isMyCastleHit,
        isNoActionsDialogOpen,
        isPlayer1,
        isRefreshing: isLoadingBattle,
        isUndoing,
        myCastlePosition,
        onInstallTower,
        onMoveTower,
        onNextTurn,
        onUndoAction,
        refreshBattle: fetchBattle,
        setIsCastleHitDialogOpen,
        setIsNoActionsDialogOpen,
        setTowers,
        setTriggerAnimation,
        tickCount,
        towers,
        triggerAnimation,
      }}
    >
      {children}
    </BattleContext.Provider>
  );
};

export const useBattle = (): BattleContextType => useContext(BattleContext);
