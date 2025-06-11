import { useComponentValue } from '@latticexyz/react';
import { HelpCircle, Loader2, Play, Undo2 } from 'lucide-react';
import { useMemo } from 'react';

import { ClickIndicator } from '@/components/ClickIndicator';
import { Button } from '@/components/ui/button';
import { useBattle } from '@/contexts/BattleContext';
import { useMUD } from '@/hooks/useMUD';

type BattleControlButtonsProps = {
  setIsHelpDialogOpen: (open: boolean) => void;
};

export const BattleControlButtons: React.FC<BattleControlButtonsProps> = ({
  setIsHelpDialogOpen,
}) => {
  const {
    components: { TutorialProgress },
    network: { globalPlayerId },
  } = useMUD();
  const { battle, isChangingTurn, isUndoing, onNextTurn, onUndoAction } =
    useBattle();

  const tutorialProgress = useComponentValue(TutorialProgress, globalPlayerId);

  const showNextTurnPrompt = useMemo(() => {
    if (!tutorialProgress) return false;
    return (
      tutorialProgress.step1Completed &&
      tutorialProgress.step2Completed &&
      tutorialProgress.step3Completed &&
      !tutorialProgress.step4Completed
    );
  }, [tutorialProgress]);

  return (
    <>
      <Button
        className="border-purple-500 hover:bg-purple-950/50 hover:text-purple-300 text-purple-400"
        onClick={() => setIsHelpDialogOpen(true)}
        size="sm"
        variant="outline"
      >
        <HelpCircle className="h-4 mr-1 w-4" />
        Help
      </Button>
      <Button
        className="border-orange-500 hover:bg-orange-950/50 hover:text-orange-400 text-orange-400"
        disabled={isUndoing || battle?.actionCount === 2}
        onClick={onUndoAction}
        size="sm"
        variant="outline"
      >
        {isUndoing ? (
          <Loader2 className=" animate-spin h-6 w-6" />
        ) : (
          <Undo2 className="h-4 w-4 mr-1" />
        )}
        Undo
      </Button>
      <div className="relative">
        <Button
          className="bg-cyan-800 hover:bg-cyan-700 text-white"
          disabled={isChangingTurn}
          onClick={onNextTurn}
          size="sm"
        >
          {isChangingTurn ? (
            <Loader2 className=" animate-spin h-6 w-6" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          Next Turn
        </Button>
        {showNextTurnPrompt && <ClickIndicator />}
      </div>
    </>
  );
};
