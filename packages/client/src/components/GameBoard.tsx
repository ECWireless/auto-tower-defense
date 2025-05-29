import { useDndContext } from '@dnd-kit/core';
import { Binoculars, Loader2, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GiCannon,
  GiCastle,
  GiDefensiveWall,
  GiMineExplosion,
} from 'react-icons/gi';
import { zeroAddress } from 'viem';
import { useAccount } from 'wagmi';

import { Draggable } from '@/components/Draggable';
import { Droppable } from '@/components/Droppable';
import { SystemModificationDrawer } from '@/components/SystemModificationDrawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGame } from '@/contexts/GameContext';
import { useSettings } from '@/contexts/SettingsContext';
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

export const GameBoard: React.FC = () => {
  const { address: playerAddress } = useAccount();
  const {
    activeTowerId,
    enemyCastlePosition,
    game,
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
  } = useGame();
  const { playSfx } = useSettings();
  const { over: draggingOver, active: draggingActive } = useDndContext();

  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [isSystemDrawerOpen, setIsSystemDrawerOpen] = useState(false);
  const [tooltipSelection, setTooltipSelection] = useState<string | null>(null);

  const onViewTower = useCallback(
    (tower: Tower) => {
      setSelectedTower(tower);
      setIsSystemDrawerOpen(true);
    },
    [setSelectedTower],
  );

  const canChangeTurn = useMemo(() => {
    if (!game) return false;
    if (game.endTimestamp !== BigInt(0)) return false;
    if (game.turn === game.player2Id) return true;
    return game.turn === game.player1Id && game.actionCount === 0;
  }, [game]);

  useEffect(() => {
    if (!canChangeTurn) return () => {};
    if (triggerAnimation) return () => {};
    if (isSystemDrawerOpen) return () => {};

    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onNextTurn();
      }
    };

    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [canChangeTurn, isSystemDrawerOpen, onNextTurn, triggerAnimation]);

  if (!game) return null;

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

        {/* Game grid with row numbers */}
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
                    className={`aspect-square relative ${draggingOver?.id === tileId ? 'hover' : ''} ${isLeftSide ? 'left' : ''} ${isTowerSelected ? 'selected' : ''} 
                        ${
                          isBlueBase
                            ? 'base-blue flex game-cell items-center justify-center'
                            : isOrangeBase
                              ? 'base-orange flex game-cell items-center justify-center'
                              : `game-cell ${playerSideClass}`
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
                                towerOnTile.owner === playerAddress && (
                                  <div
                                    className="absolute bg-gray-800 border border-cyan-500 hover:bg-gray-700 hover:cursor-pointer p-1.5 rounded-full shadow-lg top-1/2 transition-colors z-20 -left-[35px]"
                                    onClick={() => onViewTower(towerOnTile)}
                                    style={{
                                      transform: 'translateY(-50%)',
                                    }}
                                  >
                                    <Wrench className="h-4 text-cyan-400 w-4" />
                                  </div>
                                )}
                              {tooltipSelection === towerOnTile.id &&
                                towerOnTile.owner !== playerAddress && (
                                  <div
                                    className="absolute bg-gray-800 border border-pink-500 hover:bg-gray-700 hover:cursor-pointer p-1.5 rounded-full shadow-lg top-1/2 transition-colors z-20 -left-[35px]"
                                    onClick={() => {
                                      onViewTower(towerOnTile);
                                      // Reset the active tower
                                      handleTowerSelect('', 'offense');
                                    }}
                                    style={{
                                      transform: 'translateY(-50%)',
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
                                      towerOnTile.owner === game.player2Id
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
                                          ? 'text-cyan-400'
                                          : 'text-pink-400'
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
                const towerCollision = towers.find(
                  _tower =>
                    _tower.id !== tower.id &&
                    Math.abs(
                      _tower.x - tower.projectileTrajectory[tickCount].x,
                    ) <= 5 &&
                    Math.abs(
                      _tower.y - tower.projectileTrajectory[tickCount].y,
                    ) <= 5 &&
                    _tower.owner !== tower.owner,
                );

                const enemyCastleCollision =
                  Math.abs(
                    enemyCastlePosition.x -
                      tower.projectileTrajectory[tickCount].x,
                  ) <= 5 &&
                  Math.abs(
                    enemyCastlePosition.y -
                      tower.projectileTrajectory[tickCount].y,
                  ) <= 5;

                const myCastleCollision =
                  Math.abs(
                    myCastlePosition.x -
                      tower.projectileTrajectory[tickCount].x,
                  ) <= 5 &&
                  Math.abs(
                    myCastlePosition.y -
                      tower.projectileTrajectory[tickCount].y,
                  ) <= 5;

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
        <SystemModificationDrawer
          isSystemDrawerOpen={isSystemDrawerOpen}
          setIsSystemDrawerOpen={setIsSystemDrawerOpen}
          tower={selectedTower}
        />
      )}
    </div>
  );
};
