import { useDndContext } from '@dnd-kit/core';
import { useComponentValue } from '@latticexyz/react';
import { singletonEntity } from '@latticexyz/store-sync/recs';
import { Binoculars, Loader2, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GiCannon,
  GiCastle,
  GiDefensiveWall,
  GiMineExplosion,
} from 'react-icons/gi';
import { zeroAddress } from 'viem';

import { ClickIndicator } from '@/components/ClickIndicator';
import { Draggable } from '@/components/Draggable';
import { Droppable } from '@/components/Droppable';
import { TowerAssemblyDrawer } from '@/components/TowerAssemblyDrawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBattle } from '@/contexts/BattleContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useMUD } from '@/hooks/useMUD';
import {
  TutorialSteps,
  useTutorialIndicator,
} from '@/hooks/useTutorialIndicator';
import { getActualCoordinates } from '@/utils/helpers';
import { type Tower } from '@/utils/types';

export const INSTALLABLE_TOWERS = [
  {
    id: 'tower1',
    color: 'from-cyan-900/50 to-cyan-800/30',
    icon: <GiCannon size={28} className="text-cyan-400" />,
    name: 'Cannon',
    type: 'offense' as 'offense' | 'defense',
  },
  {
    id: 'tower2',
    color: 'from-cyan-900/50 to-cyan-800/30',
    icon: <GiDefensiveWall size={24} className="text-cyan-400" />,
    name: 'Wall',
    type: 'defense' as 'offense' | 'defense',
  },
];

// Grid dimensions
const GRID_ROWS = 7;
const GRID_COLS = 14;

export const BattleBoard: React.FC = () => {
  const {
    components: { DefaultLogic },
    network: { globalPlayerId },
  } = useMUD();
  const {
    activeTowerId,
    battle,
    enemyCastlePosition,
    handleTowerSelect,
    installingPosition,
    isInstallingTower,
    isPlayer1,
    myCastlePosition,
    onInstallTower,
    onMoveTower,
    onNextTurn,
    tickCount,
    towers,
    triggerAnimation,
  } = useBattle();
  const { playSfx } = useSettings();
  const { over: draggingOver, active: draggingActive } = useDndContext();
  const { tutorialStep } = useTutorialIndicator();

  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [isAssemblyDrawerOpen, setIsAssemblyDrawerOpen] = useState(false);
  const [tooltipSelection, setTooltipSelection] = useState<string | null>(null);

  const defaultLogicAddress = useComponentValue(
    DefaultLogic,
    singletonEntity,
  )?.value;

  const onViewTower = useCallback(
    (tower: Tower) => {
      setSelectedTower(tower);
      setIsAssemblyDrawerOpen(true);
    },
    [setSelectedTower],
  );

  const canChangeTurn = useMemo(() => {
    if (!battle) return false;
    if (battle.endTimestamp !== BigInt(0)) return false;
    if (battle.turn === battle.player2Id) return true;
    return battle.turn === battle.player1Id && battle.actionCount === 0;
  }, [battle]);

  useEffect(() => {
    if (!canChangeTurn) return () => {};
    if (triggerAnimation) return () => {};
    if (isAssemblyDrawerOpen) return () => {};

    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onNextTurn();
      }
    };

    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [canChangeTurn, isAssemblyDrawerOpen, onNextTurn, triggerAnimation]);

  if (!battle) return null;

  return (
    <div className="bg-gray-900 overflow-x-auto w-full sm:overflow-hidden">
      <div className="gap-1 grid grid-rows-[20px_repeat(7,minmax(0,1fr))] min-w-full p-1 relative w-max">
        {/* Center divider line */}
        <div
          className="absolute bg-cyan-400 bottom-0 left-1/2 top-0 transform -translate-x-1/2 w-[2px] z-10"
          style={{
            boxShadow: '0 0 8px 2px rgba(34,211,238,0.6)',
          }}
        />

        {/* Column numbers (0-13) */}
        <div className="gap-1 grid grid-cols-[auto_repeat(14,minmax(0,1fr))_auto] min-w-[600px] mt-1 sm:min-w-0 mb-1">
          {/* Left spacer to match row numbers */}
          <div className="w-4" />

          {/* Column numbers */}
          {[...Array(GRID_COLS)].map((_, colIndex) => (
            <div key={`col-${colIndex}`} className="flex items-center">
              <span className="text-[8px] text-cyan-500/60">
                {colIndex * 10}
              </span>
            </div>
          ))}

          {/* Right spacer for symmetry */}
          <div className="w-4" />
        </div>

        {/* Battle grid with row numbers */}
        {[...Array(GRID_ROWS)].map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="gap-1 grid grid-cols-[auto_repeat(14,minmax(0,1fr))_auto] min-w-[600px] sm:min-w-0"
          >
            {/* Row number */}
            <div className="flex justify-center w-4">
              <span className="text-[10px] text-cyan-500/60">
                {rowIndex * 10}
              </span>
            </div>

            {/* Grid cells */}
            {[...Array(GRID_COLS)].map((_, colIndex) => {
              const isBlueBase = rowIndex === 3 && colIndex === 0;
              const isOrangeBase = rowIndex === 3 && colIndex === 13;
              const isLeftSide = colIndex <= 6;

              const myCastlePositionX = Math.floor(
                (myCastlePosition?.x ?? 10) / 10,
              );
              const myCastlePositionY = Math.floor(
                (myCastlePosition?.y ?? 10) / 10,
              );

              const enemyCastlePositionX = Math.floor(
                (enemyCastlePosition?.x ?? 10) / 10,
              );
              const enemyCastlePositionY = Math.floor(
                (enemyCastlePosition?.y ?? 10) / 10,
              );

              const myCastle =
                rowIndex === myCastlePositionY &&
                colIndex === myCastlePositionX;
              const enemyCastle =
                rowIndex === enemyCastlePositionY &&
                colIndex === enemyCastlePositionX;

              const towerOnTile = towers.find(
                tower =>
                  Math.floor(tower.x / 10) === colIndex &&
                  Math.floor(tower.y / 10) === rowIndex,
              );

              const canInstall =
                !towerOnTile && !myCastle && !enemyCastle && isLeftSide;

              const isInstalling =
                !!(
                  installingPosition?.x === colIndex &&
                  installingPosition?.y === rowIndex
                ) && isInstallingTower;

              // Determine which player's side this cell is on
              const playerSideClass = isLeftSide
                ? 'border-purple-900/20'
                : 'border-pink-900/20';

              const isTowerSelected = activeTowerId === towerOnTile?.id;
              const tileId = `${rowIndex}-${colIndex}`;

              return (
                <Droppable key={tileId} disabled={!canInstall} id={tileId}>
                  <div
                    className={`aspect-square ${draggingOver?.id === tileId ? 'hover' : ''} ${isLeftSide ? 'left' : ''} ${isTowerSelected ? 'selected' : ''} 
                        ${
                          isBlueBase
                            ? 'base-blue flex battle-cell items-center justify-center'
                            : isOrangeBase
                              ? 'base-orange flex battle-cell items-center justify-center'
                              : `battle-cell ${playerSideClass}`
                        }`}
                    onClick={() => {
                      if (
                        towerOnTile?.id &&
                        towerOnTile.id !== tooltipSelection
                      ) {
                        setTooltipSelection(towerOnTile.id);
                      } else {
                        setTooltipSelection(null);
                      }

                      if (!(isLeftSide && isPlayer1)) return;

                      if (towerOnTile) {
                        handleTowerSelect(
                          towerOnTile.id,
                          towerOnTile.projectileLogicAddress !== zeroAddress
                            ? 'offense'
                            : 'defense',
                        );
                      } else if (
                        canInstall &&
                        activeTowerId &&
                        INSTALLABLE_TOWERS.map(tower => tower.id).includes(
                          activeTowerId,
                        )
                      ) {
                        onInstallTower(rowIndex, colIndex);
                      } else if (canInstall && activeTowerId) {
                        onMoveTower(rowIndex, colIndex);
                      }
                    }}
                  >
                    {isInstalling && (
                      <div className="flex h-[100%] items-center justify-center">
                        <Loader2 className="animate-spin h-6 text-cyan-400 w-6" />
                      </div>
                    )}

                    {!!towerOnTile && (
                      <TooltipProvider>
                        <Tooltip open={tooltipSelection === towerOnTile.id}>
                          <TooltipTrigger
                            asChild
                            className="flex items-center h-full justify-center"
                          >
                            <div>
                              {tooltipSelection === towerOnTile.id &&
                                towerOnTile.owner === globalPlayerId && (
                                  <div
                                    className="absolute bg-gray-800 border border-cyan-500 hover:bg-gray-700 hover:cursor-pointer p-1.5 rounded-full shadow-lg top-1/2 transition-colors z-20 -left-[35px]"
                                    onClick={() => onViewTower(towerOnTile)}
                                    style={{
                                      left: `calc(${colIndex} * (100% / ${GRID_COLS} - 2px))`,
                                      top: `calc(${rowIndex} * (100% / ${GRID_ROWS} - 4px))`,
                                      transform: 'translate(-75%, 125%)',
                                    }}
                                  >
                                    {tutorialStep ===
                                      TutorialSteps.FOUR_FOUR && (
                                      <div className="absolute -top-1 left-8">
                                        <ClickIndicator />
                                      </div>
                                    )}
                                    <Wrench className="h-4 text-cyan-400 w-4" />
                                  </div>
                                )}
                              {tooltipSelection === towerOnTile.id &&
                                towerOnTile.owner !== globalPlayerId && (
                                  <div
                                    className="absolute bg-gray-800 border border-pink-500 hover:bg-gray-700 hover:cursor-pointer p-1.5 rounded-full shadow-lg top-1/2 transition-colors z-20 -left-[35px]"
                                    onClick={() => {
                                      onViewTower(towerOnTile);
                                      // Reset the active tower
                                      handleTowerSelect('', 'offense');
                                    }}
                                    style={{
                                      left: `calc(${colIndex} * (100% / ${GRID_COLS} - 2px))`,
                                      top: `calc(${rowIndex} * (100% / ${GRID_ROWS} - 4px))`,
                                      transform: 'translate(-75%, 125%)',
                                    }}
                                  >
                                    <Binoculars className="h-4 text-pink-400 w-4" />
                                  </div>
                                )}
                              <Draggable
                                id={towerOnTile.id}
                                disabled={!(isLeftSide && isPlayer1)}
                              >
                                <div
                                  onDoubleClick={() => onViewTower(towerOnTile)}
                                  style={{
                                    transform:
                                      towerOnTile.owner === battle.player2Id
                                        ? 'rotateY(180deg)'
                                        : 'none',
                                    touchAction: 'none',
                                    cursor: isLeftSide
                                      ? activeTowerId === towerOnTile?.id &&
                                        !!draggingActive
                                        ? 'grabbing'
                                        : 'grab'
                                      : 'pointer',
                                  }}
                                >
                                  {towerOnTile.projectileLogicAddress !==
                                  zeroAddress ? (
                                    <GiCannon
                                      className={
                                        isLeftSide
                                          ? towerOnTile.projectileLogicAddress ===
                                            defaultLogicAddress
                                            ? 'text-cyan-400'
                                            : 'text-blue-600'
                                          : towerOnTile.projectileLogicAddress ===
                                              defaultLogicAddress
                                            ? 'text-pink-400'
                                            : 'text-red-600'
                                      }
                                      size={28}
                                    />
                                  ) : (
                                    <GiDefensiveWall
                                      className={
                                        isLeftSide
                                          ? 'text-cyan-400'
                                          : 'text-pink-400'
                                      }
                                      size={24}
                                    />
                                  )}
                                </div>
                              </Draggable>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {towerOnTile.projectileLogicAddress !==
                              zeroAddress
                                ? 'Offensive Tower'
                                : 'Defensive Tower'}{' '}
                              - Health: {towerOnTile.currentHealth}/
                              {towerOnTile.maxHealth}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {isBlueBase && (
                      <TooltipProvider>
                        <Tooltip
                          delayDuration={200}
                          open={tooltipSelection === 'myCastle'}
                        >
                          <TooltipTrigger
                            onClick={() => setTooltipSelection('myCastle')}
                            onMouseEnter={() => setTooltipSelection('myCastle')}
                            onMouseLeave={() => setTooltipSelection(null)}
                          >
                            <GiCastle className="text-blue-400" size={24} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Your Castle - Health:{' '}
                              {myCastlePosition?.currentHealth}/
                              {myCastlePosition?.maxHealth}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {isOrangeBase && (
                      <TooltipProvider>
                        <Tooltip
                          delayDuration={200}
                          open={tooltipSelection === 'enemyCastle'}
                        >
                          <TooltipTrigger
                            onClick={() => setTooltipSelection('enemyCastle')}
                            onMouseEnter={() =>
                              setTooltipSelection('enemyCastle')
                            }
                            onMouseLeave={() => setTooltipSelection(null)}
                          >
                            <GiCastle className="text-pink-400" size={24} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Enemy Castle - Health:{' '}
                              {enemyCastlePosition?.currentHealth}/
                              {enemyCastlePosition?.maxHealth}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {rowIndex === 3 &&
                      colIndex === 4 &&
                      !isInstalling &&
                      tutorialStep === TutorialSteps.THREE_TWO && (
                        <div
                          style={{
                            left: `calc(${colIndex} * (100% / ${GRID_COLS}))`,
                            top: `calc(${rowIndex} * (100% / ${GRID_ROWS}))`,
                            transform: 'translate(0%, -50%)',
                          }}
                        >
                          <ClickIndicator />
                        </div>
                      )}
                    {rowIndex === 0 &&
                      colIndex === 6 &&
                      !isInstalling &&
                      tutorialStep === TutorialSteps.FOUR_TWO && (
                        <div
                          style={{
                            left: `calc(${colIndex} * (100% / ${GRID_COLS}))`,
                            top: `calc(${rowIndex} * (100% / ${GRID_ROWS}))`,
                            transform: 'translate(0%, -50%)',
                          }}
                        >
                          <ClickIndicator />
                        </div>
                      )}
                    {rowIndex === 1 &&
                      colIndex === 7 &&
                      tutorialStep === TutorialSteps.FOUR_THREE && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `calc(${colIndex} * (100% / ${GRID_COLS})  - 5px)`,
                            top: `calc(${rowIndex} * (100% / ${GRID_ROWS}) - 25px)`,
                          }}
                        >
                          <ClickIndicator />
                        </div>
                      )}
                  </div>
                </Droppable>
              );
            })}

            {/* Right spacer for symmetry */}
            <div className="w-4" />
          </div>
        ))}

        {triggerAnimation && (
          <div
            className="absolute"
            style={{
              height: 'calc(100% - 2rem)',
              left: '1.5rem',
              top: '1.7rem',
              width: 'calc(100% - 3rem)',
            }}
          >
            {towers.map(tower => {
              if (
                myCastlePosition &&
                enemyCastlePosition &&
                tower.projectileTrajectory[tickCount]
              ) {
                const { actualX, actualY } = getActualCoordinates(
                  tower.projectileTrajectory[tickCount].x,
                  tower.projectileTrajectory[tickCount].y,
                );
                const towerCollision = towers.find(
                  _tower =>
                    _tower.id !== tower.id &&
                    _tower.x === actualX &&
                    _tower.y === actualY &&
                    _tower.owner !== tower.owner,
                );

                const enemyCastleCollision =
                  enemyCastlePosition.x === actualX &&
                  enemyCastlePosition.y === actualY;

                const myCastleCollision =
                  myCastlePosition.x === actualX &&
                  myCastlePosition.y === actualY;

                let collisionEntity:
                  | Tower
                  | {
                      currentHealth: number;
                      maxHealth: number;
                      x: number;
                      y: number;
                    }
                  | null = towerCollision ?? null;

                if (myCastleCollision) {
                  collisionEntity = myCastlePosition;
                }

                if (enemyCastleCollision) {
                  collisionEntity = enemyCastlePosition;
                }

                if (collisionEntity) {
                  playSfx('explosion');
                  return (
                    <div
                      id={`projectile-${tower.id}`}
                      key={`projectile-${tower.id}`}
                      className="flex items-center justify-center absolute"
                      style={{
                        height: 'calc(100% / 7)',
                        left: `calc((100% / 14) * ${collisionEntity.x / 10})`,
                        top: `calc((100% / 7) * ${collisionEntity.y / 10})`,
                        transform: 'translateX(-50%) translateY(-50%)',
                        width: 'calc(100% / 14)',
                        zIndex: 1,
                      }}
                    >
                      <GiMineExplosion color="red" size={20} />
                    </div>
                  );
                }

                return (
                  <div
                    id={`projectile-${tower.id}`}
                    key={`projectile-${tower.id}`}
                    className={`flex items-center justify-center absolute`}
                    style={{
                      height: 'calc(100% / 7)',
                      left: `calc((100% / 14) * ${tower.projectileTrajectory[tickCount].x / 10})`,
                      top: `calc((100% / 7) * ${tower.projectileTrajectory[tickCount].y / 10})`,
                      transform: 'translateX(-50%) translateY(-50%)',
                      width: 'calc(100% / 14)',
                      zIndex: 1,
                    }}
                  >
                    <div className="projectile" />
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
        )}
      </div>

      {selectedTower && (
        <TowerAssemblyDrawer
          isAssemblyDrawerOpen={isAssemblyDrawerOpen}
          setIsAssemblyDrawerOpen={setIsAssemblyDrawerOpen}
          tower={selectedTower}
        />
      )}
    </div>
  );
};
