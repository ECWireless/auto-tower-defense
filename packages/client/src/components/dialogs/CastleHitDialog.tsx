import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBattle } from '@/contexts/BattleContext';

export const CastleHitDialog: React.FC = () => {
  const {
    battle,
    isCastleHitDialogOpen,
    isMyCastleHit,
    setIsCastleHitDialogOpen,
    triggerAnimation,
  } = useBattle();

  if (!battle || triggerAnimation) {
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
            <DialogTitle className="text-pink-400 text-2xl">
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
          <DialogTitle className="text-cyan-400 text-2xl">
            You Hit {battle.player2Username}&apos;s Castle!
          </DialogTitle>
        </DialogHeader>
        <p>
          {battle.player2Username}&apos;s castle only has <strong>1 HP</strong>{' '}
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
