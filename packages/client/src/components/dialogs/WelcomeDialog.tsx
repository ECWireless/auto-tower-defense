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

export const WelcomeDialog: React.FC = () => {
  const {
    systemCalls: { completeTutorialStep },
  } = useMUD();
  const { playSfx } = useSettings();
  const { tutorialStep } = useTutorialIndicator();

  const [isCompleting, setIsCompleting] = useState(false);
  const [isSecondPage, setIsSecondPage] = useState(false);

  const onCompleteWelcomeTutorial = useCallback(async () => {
    try {
      setIsCompleting(true);
      playSfx('click2');

      const { error, success } = await completeTutorialStep(1);

      if (error && !success) {
        throw new Error(error);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Completing Welcome Tutorial', {
        description: (error as Error).message,
      });
    } finally {
      setIsCompleting(false);
    }
  }, [completeTutorialStep, playSfx]);

  return (
    <Dialog open={tutorialStep === TutorialSteps.ONE}>
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900/95 border border-cyan-900/50 max-h-[90vh] overflow-y-auto text-white"
        showClose={false}
      >
        <DialogHeader>
          <DialogTitle className="font-bold text-cyan-400 text-2xl">
            Welcome!
          </DialogTitle>
        </DialogHeader>

        {!isSecondPage && (
          <div className="bg-gray-800/50 my-4 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-lg text-white">
              How to Play
            </h3>
            <p>
              The ultimate goal of Auto Tower Defense to to accumulate
              <span className="font-semibold text-yellow-400">
                {' '}
                electricity
              </span>
              , which can be used to power a{' '}
              <span className="font-semibold text-green-400">
                battle run
              </span>{' '}
              or be sold for
              <span className="font-semibold text-blue-400"> USDC</span>.
            </p>
            <p className="mt-4">There are 3 ways to gain electricity:</p>
            <ul className="mt-2 space-y-2 text-gray-200">
              <li className="flex gap-2 items-start">
                <div className="mt-1">•</div>
                <p>Win battles against other players</p>
              </li>
              <li className="flex gap-2 items-start">
                <div className="mt-1">•</div>
                <p>
                  Earn a royalty fee from tower components you engineered and
                  patented
                </p>
              </li>
              <li className="flex gap-2 items-start">
                <div className="mt-1">•</div>
                <p>Purchase electricity from the Solar Farm with USDC</p>
              </li>
            </ul>
          </div>
        )}

        {isSecondPage && (
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-lg text-white">
              Your First Battle Run
            </h3>
            <p>
              Since you&apos;re new to the game, the local
              <span className="font-semibold text-yellow-400">
                {' '}
                Solar Farm{' '}
              </span>
              has graciously given you a free,{' '}
              <span className="font-semibold text-green-400">
                fully-charged battery
              </span>
              ! You&apos;ll notice, though, that a portion of your battery (8
              kWh) has been staked into your battle board.
            </p>
            <div className="flex mt-4 justify-center">
              <img
                className="border rounded-lg w-[60%]"
                src="/assets/images/staked-electricity.png"
              />
            </div>
            <p className="mt-8">
              This is the cost of starting a new battle run.
            </p>
            <p className="mt-4">
              As you win each battle in the run, half of each opponent&apos;s
              <span className="font-semibold text-yellow-400"> stake </span>will
              be transferred to your total stake. But once you lose a battle,
              the run ends, and half of your stake goes to your opponent. The
              remaining half is returned to your battery.
            </p>
            <p className="mt-4">
              Go ahead and get started with your run, and we&apos;ll walk you
              through how to battle.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            className="bg-cyan-800 hover:bg-cyan-700 text-white w-full"
            disabled={isCompleting}
            onClick={() =>
              isSecondPage ? onCompleteWelcomeTutorial() : setIsSecondPage(true)
            }
          >
            {isCompleting && <Loader2 className="animate-spin h-6 w-6" />}
            {isSecondPage ? 'Start Battle Run' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
