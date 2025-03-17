import { Entity } from '@latticexyz/recs';
import { Check, Copy, Home } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zeroAddress } from 'viem';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { CastleHitDialog } from '@/components/CastleHitDialog';
import { GameBoard, INSTALLABLE_TOWERS } from '@/components/GameBoard';
import { GameControlButtons } from '@/components/GameControlButtons';
import { GameStatusBar } from '@/components/GameStatusBar';
import { HowToPlay } from '@/components/HowToPlay';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NoActionsDialog } from '@/components/NoActionsDialog';
import { NoGameScreen } from '@/components/NoGameScreen';
import { PlayAgainDialog } from '@/components/PlayAgainDialog';
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
    activeTowerId,
    game,
    handleDragStart,
    handleTowerSelect,
    isChangingTurn,
    isPlayer1,
    isRefreshing,
    onNextTurn,
  } = useGame();

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
          <GameStatusBar game={game} />

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
          <div className="bg-gray-900 border border-cyan-900/50 mt-1 p-2 overflow-x-auto rounded-b-md">
            <div className="mb-1 px-1 text-cyan-400 text-xs">TOWERS</div>
            <div className="flex min-w-[600px] sm:min-w-0 space-x-2">
              {INSTALLABLE_TOWERS.map(tower => (
                <div
                  key={tower.id}
                  onClick={() => handleTowerSelect(tower.id, tower.type)}
                  className={`tower-card ${activeTowerId === tower.id ? 'selected' : ''} bg-gradient-to-b ${tower.color} cursor-pointer flex flex-col items-center min-w-[60px] p-2 rounded`}
                  draggable={isPlayer1}
                  onDragStart={e => handleDragStart(e, tower.id, tower.type)}
                >
                  <div className="flex h-8 items-center justify-center">
                    {tower.icon}
                  </div>
                  <span className="mt-1 text-white text-xs">{tower.name}</span>
                </div>
              ))}
            </div>
          </div>

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

      <HowToPlay
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
  );
};
