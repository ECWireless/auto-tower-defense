import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Entity } from '@latticexyz/recs';
import { decodeEntity } from '@latticexyz/store-sync/recs';
import { Check, Copy, Home } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zeroAddress } from 'viem';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { CastleHitDialog } from '@/components/CastleHitDialog';
import { GameBoard, INSTALLABLE_TOWERS } from '@/components/GameBoard';
import { GameControlButtons } from '@/components/GameControlButtons';
import { GameStatusBar } from '@/components/GameStatusBar';
import { HowToPlayDialog } from '@/components/HowToPlayDialog';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NoActionsDialog } from '@/components/NoActionsDialog';
import { NoGameScreen } from '@/components/NoGameScreen';
import { PlayAgainDialog } from '@/components/PlayAgainDialog';
import { TowerSelection } from '@/components/TowerSelection';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { useSettings } from '@/contexts/SettingsContext';
import useCopy from '@/hooks/useCopy';
import { useMUD } from '@/MUDContext';
import { shortenAddress } from '@/utils/helpers';

const HOW_TO_SEEN_KEY = 'how-to-seen';

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
    network: { playerEntity },
  } = useMUD();
  const {
    activeTowerId,
    enemyCastlePosition,
    game,
    handleDragStart,
    isChangingTurn,
    isPlayer1,
    isRefreshing,
    myCastlePosition,
    onInstallTower,
    onMoveTower,
    onNextTurn,
    towers,
  } = useGame();
  const { playSfx } = useSettings();
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const sensors = useSensors(pointerSensor);

  // Add game ID to tab title
  useEffect(() => {
    if (game) {
      document.title = `Game ${game.id} - Auto Tower Defense`;
    }
  }, [game]);

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isGameOverDialogOpen, setIsGameOverDialogOpen] = useState(false);

  useEffect(() => {
    if (!game) return;
    if (game.winner === zeroAddress && game.endTimestamp === BigInt(0)) return;

    const playerAddress = decodeEntity(
      {
        address: 'address',
      },
      playerEntity,
    ).address;

    if (playerAddress !== game.player1Address) return;

    if (game.winner === playerAddress) {
      playSfx('win');
    }
    setIsGameOverDialogOpen(true);
  }, [game, playerEntity, playSfx]);

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

  const onDragStart = (event: DragStartEvent) => {
    if (!isPlayer1) return;

    const { active } = event;
    const activeTower = {
      id: '',
      type: 'offense' as 'offense' | 'defense',
    };

    const installableTower = INSTALLABLE_TOWERS.find(
      tower => tower.id === active.id,
    );

    if (installableTower) {
      activeTower.id = installableTower.id;
      activeTower.type = installableTower.type;
    } else {
      const tower = towers.find(tower => tower.id === active.id);
      if (tower) {
        activeTower.id = tower.id;
        activeTower.type =
          tower.projectileLogicAddress === zeroAddress ? 'defense' : 'offense';

        const isLeftSide = tower.x <= 65;
        if (!isLeftSide) return;
      }
    }

    if (activeTower.id) {
      handleDragStart(activeTower.id, activeTower.type);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    if (!over) return;

    const [row, col] = over.id.toString().split('-').map(Number);

    if (INSTALLABLE_TOWERS.some(tower => tower.id === activeTowerId)) {
      onInstallTower(row, col);
    } else {
      onMoveTower(row, col);
    }
  };

  if (isRefreshing) {
    return <LoadingScreen width={100} />;
  }

  if (!game) {
    return <NoGameScreen />;
  }

  return (
    <DndContext
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      sensors={sensors}
    >
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className="h-6 hover:cursor-pointer hover:text-white text-gray-400 w-6"
                  onClick={() => copyToClipboard(game.id)}
                >
                  {copiedText === game.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copiedText === game.id ? 'Copied!' : 'Copy address'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Game Container */}
        <div className="flex justify-center items-center flex-1 p-4 pt-16 z-1">
          <div className="w-full max-w-3xl">
            <GameStatusBar
              enemyCastlePosition={enemyCastlePosition}
              game={game}
              myCastlePosition={myCastlePosition}
            />

            {/* Control Buttons - Desktop */}
            <div className="hidden justify-center mb-1 sm:flex space-x-2">
              <GameControlButtons
                isChangingTurn={isChangingTurn}
                onNextTurn={onNextTurn}
                setIsHelpDialogOpen={setIsHelpDialogOpen}
              />
            </div>

            <GameBoard />

            {/* Tower Selection Row */}
            <TowerSelection />

            {/* Control Buttons - Mobile */}
            <div className="flex justify-center mt-4 sm:hidden space-x-2">
              <GameControlButtons
                isChangingTurn={isChangingTurn}
                onNextTurn={onNextTurn}
                setIsHelpDialogOpen={setIsHelpDialogOpen}
              />
            </div>
          </div>
        </div>

        <HowToPlayDialog
          onChangeHowToDialog={onChangeHowToDialog}
          isHelpDialogOpen={isHelpDialogOpen}
        />
        <PlayAgainDialog
          isGameOverDialogOpen={isGameOverDialogOpen}
          setIsGameOverDialogOpen={setIsGameOverDialogOpen}
        />
        <NoActionsDialog />
        <CastleHitDialog />
      </div>
    </DndContext>
  );
};
