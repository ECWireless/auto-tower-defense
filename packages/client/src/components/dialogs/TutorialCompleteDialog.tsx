import { Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettings } from '@/contexts/SettingsContext';
import { useMUD } from '@/hooks/useMUD';
import {
  TutorialSteps,
  useTutorialIndicator,
} from '@/hooks/useTutorialIndicator';

export const TutorialCompeleteDialog: React.FC = () => {
  const {
    systemCalls: { completeTutorialStep },
  } = useMUD();
  const { playSfx } = useSettings();
  const { tutorialStep } = useTutorialIndicator();

  const [isCompleting, setIsCompleting] = useState(false);

  const onCompleteTutorial = useCallback(async () => {
    try {
      setIsCompleting(true);
      playSfx('click2');

      const { error, success } = await completeTutorialStep(5);

      if (error && !success) {
        throw new Error(error);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Completing Tutorial', {
        description: (error as Error).message,
      });
    } finally {
      setIsCompleting(false);
    }
  }, [completeTutorialStep, playSfx]);

  return (
    <Dialog open={tutorialStep === TutorialSteps.FIVE}>
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900/95 border border-cyan-900/50 max-h-[90vh] overflow-y-auto text-white"
        showClose={false}
      >
        <DialogHeader>
          <DialogTitle className="font-bold text-cyan-400 text-2xl">
            Tutorial Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p>
            Congrats! You have completed the tutorial. Go ahead and finish this
            level to start facing actual player-enemies.
          </p>
        </div>

        <DialogFooter>
          <Button
            className="bg-cyan-800 hover:bg-cyan-700 text-white w-full"
            disabled={isCompleting}
            onClick={onCompleteTutorial}
          >
            {isCompleting && <Loader2 className="animate-spin h-6 w-6" />}
            Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
