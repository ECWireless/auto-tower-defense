import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GiCannon,
  GiCastle,
  GiDefensiveWall,
  GiMineExplosion,
} from 'react-icons/gi';
import { zeroAddress } from 'viem';

import { SystemModificationDrawer } from '@/components/SystemModificationDrawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGame } from '@/contexts/GameContext';
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
  const {
    activeTowerId,
    allowDrop,
    enemyCastlePosition,
    game,
    handleDragStart,
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

  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [isSystemDrawerOpen, setIsSystemDrawerOpen] = useState(false);

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
    if (game.turn === game.player2Address) return true;
    return game.turn === game.player1Address && game.actionCount === 0;
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
    <div className="bg-gray-900 overflow-x-auto w-full">
      <div className="gap-1 grid grid-rows-[20px_repeat(7,minmax(0,1fr))] min-w-full p-1 relative w-max">
        {/* Center divider line */}
        <div className="absolute bg-cyan-400 bottom-0 left-1/2 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)] top-0 transform -translate-x-1/2 w-[2px] z-10"></div>

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
              // Add game pieces for specific positions
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

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`aspect-square relative ${isLeftSide ? 'left' : ''} ${isTowerSelected ? 'selected' : ''}
                        ${
                          isBlueBase
                            ? 'base-blue flex game-cell items-center justify-center'
                            : isOrangeBase
                              ? 'base-orange flex game-cell items-center justify-center'
                              : `game-cell ${playerSideClass}`
                        }`}
                  onClick={e => {
                    if (isLeftSide) return;
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
                      onInstallTower(e, rowIndex, colIndex);
                    } else if (canInstall && activeTowerId) {
                      onMoveTower(e, rowIndex, colIndex);
                    }
                  }}
                  onDrop={e =>
                    activeTowerId &&
                    INSTALLABLE_TOWERS.map(tower => tower.id).includes(
                      activeTowerId,
                    )
                      ? onInstallTower(e, rowIndex, colIndex)
                      : onMoveTower(e, rowIndex, colIndex)
                  }
                  onDragOver={canInstall ? allowDrop : undefined}
                >
                  {isInstalling && (
                    <div className="flex h-[100%] items-center justify-center">
                      <Loader2 className="animate-spin h-6 text-cyan-400 w-6" />
                    </div>
                  )}

                  {!!towerOnTile && (
                    <div
                      className="flex h-[100%] items-center justify-center"
                      draggable={isLeftSide && isPlayer1}
                      onClick={() => onViewTower(towerOnTile)}
                      onDragStart={e =>
                        handleDragStart(
                          e,
                          towerOnTile.id,
                          towerOnTile.projectileLogicAddress !== zeroAddress
                            ? 'offense'
                            : 'defense',
                        )
                      }
                      style={{
                        transform:
                          towerOnTile.owner === game.player2Address
                            ? 'rotateY(180deg)'
                            : 'none',
                      }}
                    >
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger>
                            {towerOnTile.projectileLogicAddress !==
                            zeroAddress ? (
                              <GiCannon
                                className={
                                  isLeftSide ? 'text-cyan-400' : 'text-pink-400'
                                }
                                size={28}
                              />
                            ) : (
                              <GiDefensiveWall
                                className={
                                  isLeftSide ? 'text-cyan-400' : 'text-pink-400'
                                }
                                size={24}
                              />
                            )}
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
                    </div>
                  )}

                  {isBlueBase && (
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger>
                          <GiCastle className="text-blue-400" size={24} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Your Castle - Health:
                            {myCastlePosition?.currentHealth}/
                            {myCastlePosition?.maxHealth}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isOrangeBase && (
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger>
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
                    ) <= 5,
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
