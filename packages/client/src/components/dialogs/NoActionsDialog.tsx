import { Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBattle } from '@/contexts/BattleContext';

export const NoActionsDialog: React.FC = () => {
  const {
    isChangingTurn,
    isNoActionsDialogOpen,
    onNextTurn,
    setIsNoActionsDialogOpen,
  } = useBattle();

  return (
    <Dialog
      open={isNoActionsDialogOpen}
      onOpenChange={open => setIsNoActionsDialogOpen(open)}
    >
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900 border border-pink-900/50 text-white"
      >
        <DialogHeader>
          <DialogTitle className="text-pink-400 text-2xl">
            No Actions Remaining
          </DialogTitle>
        </DialogHeader>
        <p>You have no actions remaining!</p>
        <p className="font-semibold mt-2">
          You must continue to the next turn to refill your actions.
        </p>
        <DialogFooter className="sm:justify-center">
          <Button
            disabled={isChangingTurn}
            onClick={onNextTurn}
            className="bg-pink-800 hover:bg-pink-700 text-white w-full"
          >
            {isChangingTurn ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              <Play className="h-4 mr-2 w-4" />
            )}
            Next Turn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
