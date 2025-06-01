import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGame } from '@/contexts/BattleContext';

import { Button } from './ui/button';

export const CastleHitDialog: React.FC = () => {
  const {
    game,
    isCastleHitDialogOpen,
    isMyCastleHit,
    setIsCastleHitDialogOpen,
    triggerAnimation,
  } = useGame();

  if (!game || triggerAnimation) {
    return null;
  }

  if (isMyCastleHit) {
    return (
      <Dialog
        open={isCastleHitDialogOpen}
        onOpenChange={open => setIsCastleHitDialogOpen(open)}
      >
        <DialogContent
          aria-describedby={undefined}
          className="bg-gray-900 border border-pink-900/50 text-white"
        >
          <DialogHeader>
            <DialogTitle className="text-pink-400 text-xl">
              Your Castle Was Hit!
            </DialogTitle>
          </DialogHeader>
          <p className="font-semibold mt-2">
            Your castle only has <strong>1 HP</strong> remaining.
          </p>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setIsCastleHitDialogOpen(false)}
              className="bg-pink-800 hover:bg-pink-700 text-white w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isCastleHitDialogOpen}
      onOpenChange={open => setIsCastleHitDialogOpen(open)}
    >
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900 border border-cyan-900/50 text-white"
      >
        <DialogHeader>
          <DialogTitle className="text-cyan-400 text-xl">
            You Hit {game.player2Username}&apos;s Castle!
          </DialogTitle>
        </DialogHeader>
        <p>
          {game.player2Username}&apos;s castle only has <strong>1 HP</strong>{' '}
          remaining.
        </p>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={() => setIsCastleHitDialogOpen(false)}
            className="bg-cyan-400 hover:bg-cyan-900 text-white w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
