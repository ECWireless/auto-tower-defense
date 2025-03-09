import { HelpCircle, Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';

type GameControlButtonsProps = {
  isChangingTurn: boolean;
  onNextTurn: () => void;
  setIsHelpDialogOpen: (open: boolean) => void;
};

export const GameControlButtons: React.FC<GameControlButtonsProps> = ({
  isChangingTurn,
  onNextTurn,
  setIsHelpDialogOpen,
}) => {
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
        className="border-cyan-500 hover:bg-cyan-950/50 hover:text-cyan-300 text-cyan-400"
        disabled={isChangingTurn}
        onClick={onNextTurn}
        size="sm"
        variant="outline"
      >
        {isChangingTurn ? (
          <Loader2 className="h-6 animate-spin w-6" />
        ) : (
          <Play className="h-4 w-4 mr-1" />
        )}
        Next Turn
      </Button>
    </>
  );
};
