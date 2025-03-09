import { Entity } from '@latticexyz/recs';
import { Check, Copy, HelpCircle, Home, Loader2, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GiCannon,
  GiCastle,
  GiDefensiveWall,
  GiMineExplosion,
} from 'react-icons/gi';
import { useNavigate, useParams } from 'react-router-dom';
import { zeroAddress } from 'viem';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { HowToPlay } from '@/components/HowToPlay';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NoGameScreen } from '@/components/NoGameScreen';
import { PlayAgainDialog } from '@/components/PlayAgainDialog';
import { SystemModificationDrawer } from '@/components/SystemModificationDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GameProvider, useGame } from '@/contexts/GameContext';
import useCopy from '@/hooks/useCopy';
import { shortenAddress } from '@/utils/helpers';
import { type Tower } from '@/utils/types';

const HOW_TO_SEEN_KEY = 'how-to-seen';

const INSTALLABLE_TOWERS = [
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

export const GamePage = (): JSX.Element => {
  const { id } = useParams();
  return (
    <GameProvider gameId={id as Entity}>
      <InnerGamePage />
    </GameProvider>
  );
};

export const InnerGamePage = (): JSX.Element => {
  const { copiedText, copyToClipboard } = useCopy();
  const navigate = useNavigate();
  const {
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
    isRefreshing,
    myCastlePosition,
    onInstallTower,
    onMoveTower,
    onNextTurn,
    tickCount,
    towers,
    triggerAnimation,
  } = useGame();

  // Add game ID to tab title
  useEffect(() => {
    if (game) {
      document.title = `Game ${game.id} - Smart Tower Defense`;
    }
  }, [game]);

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [isSystemDrawerOpen, setIsSystemDrawerOpen] = useState(false);
  const [isGameOverDialogOpen, setIsGameOverDialogOpen] = useState(false);

  useEffect(() => {
    if (!game) return;
    if (game.winner === zeroAddress && game.endTimestamp === BigInt(0)) return;

    setIsGameOverDialogOpen(true);
  }, [game]);

  // Open How To info dialog if this is the first time the user is playing a game.
  useEffect(() => {
    const hasSeenHowToInfo = localStorage.getItem(HOW_TO_SEEN_KEY);
    if (hasSeenHowToInfo) return;
    setIsHelpDialogOpen(true);
  }, []);

  const onChangeHowToDialog = useCallback((open: boolean) => {
    if (!open) {
      setIsHelpDialogOpen(false);
      localStorage.setItem(HOW_TO_SEEN_KEY, 'true');
    } else {
      setIsHelpDialogOpen(true);
    }
  }, []);

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

  if (isRefreshing) {
    return <LoadingScreen width={100} />;
  }

  if (!game) {
    return <NoGameScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white relative">
      <BackgroundAnimation />

      {/* Top Navigation */}
      <div className="fixed left-4 top-4 z-10">
        <Button
          className="border-purple-500 hover:bg-purple-950/50 hover:text-purple-300 text-purple-400"
          onClick={() => {
            navigate('/');
          }}
          size="sm"
          variant="outline"
        >
          <Home className="h-4 mr-1 w-4" />
          Home
        </Button>
      </div>

      <div className="fixed right-4 text-cyan-400 text-sm top-4 z-10">
        <div className="flex items-center space-x-2">
          <span>Game ID: {shortenAddress(game.id)}</span>
          <Tooltip>
            <TooltipTrigger>
              <Button
                className="h-6 hover:text-black text-gray-400 w-6"
                onClick={() => copyToClipboard(game.id)}
                size="icon"
                variant="ghost"
              >
                {copiedText === game.id ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copiedText === game.id ? 'Copied!' : 'Copy address'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Game Container */}
      <div className="flex justify-center items-center flex-1 p-4 pt-16 z-1">
        <div className="w-full max-w-3xl">
          {/* Status Bar */}
          <div className="bg-gray-900 border border-purple-900/50 mb-1 p-2 sm:p-4 grid grid-cols-7 text-center items-center rounded-t-md">
            {/* Player 1 */}
            <div className="col-span-2 sm:col-span-2 text-left pl-1 sm:pl-4">
              <div className="text-[10px] sm:text-sm text-purple-300">
                PLAYER 1
              </div>
              <div className="text-xs sm:text-lg font-medium flex items-center truncate pr-1">
                <span className="truncate text-purple-400">
                  {game.player1Username}
                </span>
                {game.turn === game.player1Address && (
                  <Badge
                    variant="outline"
                    className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 text-[8px] sm:text-xs border-purple-500 text-purple-400 flex-shrink-0"
                  >
                    Turn
                  </Badge>
                )}
              </div>
            </div>

            {/* Game Info - Desktop */}
            <div className="hidden sm:flex col-span-3 justify-around">
              <div>
                <div className="text-xs text-cyan-300">LEVEL</div>
                <div className="text-lg font-medium text-cyan-400">
                  {game.level.toString()}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-xs text-cyan-300">ROUND</div>
                <div className="text-lg font-medium text-cyan-400">
                  {game.roundCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-cyan-300">ACTIONS</div>
                <div className="text-lg font-medium text-cyan-400">
                  {game.actionCount}
                </div>
              </div>
            </div>

            {/* Game Info - Mobile */}
            <div className="sm:hidden col-span-3 flex justify-around">
              <div>
                <div className="text-[8px] text-cyan-300">LVL</div>
                <div className="text-xs font-medium text-cyan-400">
                  {game.level.toString()}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[8px] text-cyan-300">RND</div>
                <div className="text-xs font-medium text-cyan-400">
                  {game.roundCount}
                </div>
              </div>
              <div>
                <div className="text-[8px] text-cyan-300">ACT</div>
                <div className="text-xs font-medium text-cyan-400">
                  {game.actionCount}
                </div>
              </div>
            </div>

            {/* Player 2 */}
            <div className="col-span-2 sm:col-span-2 text-right pr-1 sm:pr-4">
              <div className="text-[10px] sm:text-sm text-pink-300">
                PLAYER 2
              </div>
              <div className="text-xs sm:text-lg font-medium flex items-center justify-end truncate pl-1">
                {game.turn === game.player2Address && (
                  <Badge
                    variant="outline"
                    className="mr-1 sm:mr-2 h-4 sm:h-5 px-1 text-[8px] sm:text-xs border-pink-500 text-pink-400 flex-shrink-0"
                  >
                    Turn
                  </Badge>
                )}
                <span className="truncate text-pink-400">
                  {game.player2Username}
                </span>
              </div>
            </div>
          </div>

          {/* Control Buttons - Desktop */}
          <div className="hidden sm:flex justify-center mb-1 space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-500 text-purple-400 hover:bg-purple-950/50 hover:text-purple-300"
                    onClick={() => setIsHelpDialogOpen(true)}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Help
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Game Information and Rules</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-950/50 hover:text-cyan-300"
              disabled={isChangingTurn}
              onClick={onNextTurn}
            >
              {isChangingTurn ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Next Turn
            </Button>
          </div>

          {/* Main Grid */}
          <div className="bg-gray-900 overflow-x-auto w-full">
            <div className="grid grid-rows-[20px_repeat(7,minmax(0,1fr))] gap-1 p-1 w-max min-w-full relative">
              {/* Center divider line */}
              <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-[2px] bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)] z-10"></div>

              {/* Column numbers (0-13) */}
              <div className="grid grid-cols-[auto_repeat(14,minmax(0,1fr))_auto] gap-1 min-w-[600px] sm:min-w-0 mb-1 mt-1">
                {/* Left spacer to match row numbers */}
                <div className="w-4"></div>

                {/* Column numbers */}
                {[...Array(GRID_COLS)].map((_, colIndex) => (
                  <div key={`col-${colIndex}`} className="flex items-center">
                    <span className="text-[8px] text-cyan-500/60">
                      {colIndex * 10}
                    </span>
                  </div>
                ))}

                {/* Right spacer for symmetry */}
                <div className="w-4"></div>
              </div>

              {/* Game grid with row numbers */}
              {[...Array(GRID_ROWS)].map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[auto_repeat(14,minmax(0,1fr))_auto] gap-1 min-w-[600px] sm:min-w-0"
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
                    const isLeftSide = colIndex < 6;
                    const isRightSide = colIndex > 6;

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
                      !towerOnTile && !myCastle && !enemyCastle && !isRightSide;

                    const isInstalling =
                      !!(
                        installingPosition?.x === colIndex &&
                        installingPosition?.y === rowIndex
                      ) && isInstallingTower;

                    // Determine which player's side this cell is on
                    const playerSideClass = isLeftSide
                      ? 'border-purple-900/20'
                      : isRightSide
                        ? 'border-pink-900/20'
                        : '';

                    const isTowerSelected = activeTowerId === towerOnTile?.id;

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`aspect-square relative ${isLeftSide ? 'left' : ''} ${isTowerSelected ? 'selected' : ''}
                        ${
                          isBlueBase
                            ? 'game-cell base-blue flex items-center justify-center'
                            : isOrangeBase
                              ? 'game-cell base-orange flex items-center justify-center'
                              : `game-cell ${playerSideClass}`
                        }`}
                        onClick={e => {
                          if (isRightSide) return;
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
                          <div className="flex items-center justify-center h-[100%]">
                            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
                          </div>
                        )}

                        {!!towerOnTile && (
                          <div
                            className="flex items-center justify-center h-[100%]"
                            draggable={!isRightSide && isPlayer1}
                            style={{
                              transform:
                                towerOnTile.owner === game.player2Address
                                  ? 'rotateY(180deg)'
                                  : 'none',
                            }}
                            onClick={() => onViewTower(towerOnTile)}
                            onDragStart={e =>
                              handleDragStart(
                                e,
                                towerOnTile.id,
                                towerOnTile.projectileLogicAddress !==
                                  zeroAddress
                                  ? 'offense'
                                  : 'defense',
                              )
                            }
                          >
                            <TooltipProvider>
                              <Tooltip delayDuration={200}>
                                <TooltipTrigger>
                                  {towerOnTile.projectileLogicAddress !==
                                  zeroAddress ? (
                                    <GiCannon
                                      size={28}
                                      className="text-cyan-400"
                                    />
                                  ) : (
                                    <GiDefensiveWall
                                      size={24}
                                      className="text-cyan-400"
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
                                <GiCastle size={24} className="text-blue-400" />
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
                                <GiCastle size={24} className="text-pink-400" />
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

              {triggerAnimation &&
                towers.map(tower => {
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
                            left: `calc((100% / 14) * ${collisionEntity.x / 10} - 24px)`,
                            top: `calc((100% / 7) * ${collisionEntity.y / 10} + 12px)`,
                            width: 'calc(100% / 14)',
                            height: 'calc(100% / 7)',
                            transform: 'translateX(-50%) translateY(-50%)',
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
                          left: `calc((100% / 14) * ${tower.projectileTrajectory[tickCount].x / 10})`,
                          top: `calc((100% / 7) * ${tower.projectileTrajectory[tickCount].y / 10} + 12px)`,
                          width: 'calc(100% / 14)',
                          height: 'calc(100% / 7)',
                          transform: 'translateX(-50%) translateY(-50%)',
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
          </div>

          {/* Tower Selection Row */}
          <div className="mt-1 bg-gray-900 border border-cyan-900/50 p-2 overflow-x-auto rounded-b-md">
            <div className="text-cyan-400 text-xs mb-1 px-1">TOWERS</div>
            <div className="flex space-x-2 min-w-[600px] sm:min-w-0">
              {INSTALLABLE_TOWERS.map(tower => (
                <div
                  key={tower.id}
                  onClick={() => handleTowerSelect(tower.id, tower.type)}
                  className={`tower-card ${activeTowerId === tower.id ? 'selected' : ''} bg-gradient-to-b ${tower.color} rounded p-2 flex flex-col items-center cursor-pointer min-w-[60px]`}
                  draggable={isPlayer1}
                  onDragStart={e => handleDragStart(e, tower.id, tower.type)}
                >
                  <div className="flex items-center justify-center h-8">
                    {tower.icon}
                  </div>
                  <span className="text-xs text-white mt-1">{tower.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Control Buttons */}
          <div className="flex sm:hidden justify-center mt-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500 text-purple-400 hover:bg-purple-950/50 hover:text-purple-300"
              onClick={() => setIsHelpDialogOpen(true)}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-950/50 hover:text-cyan-300"
              disabled={isChangingTurn}
              onClick={onNextTurn}
            >
              {isChangingTurn ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Next Turn
            </Button>
          </div>
        </div>
      </div>
      <HowToPlay
        onChangeHowToDialog={onChangeHowToDialog}
        isHelpDialogOpen={isHelpDialogOpen}
      />
      <PlayAgainDialog
        isGameOverDialogOpen={isGameOverDialogOpen}
        setIsGameOverDialogOpen={setIsGameOverDialogOpen}
      />
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
