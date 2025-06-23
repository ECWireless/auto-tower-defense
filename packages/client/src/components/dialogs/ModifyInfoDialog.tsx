import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TutorialSteps,
  useTutorialIndicator,
} from '@/hooks/useTutorialIndicator';

export const ModifyInfoDialog: React.FC = () => {
  const { tutorialStep } = useTutorialIndicator();

  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);

  useEffect(() => {
    if (tutorialStep === TutorialSteps.FOUR_ONE) {
      setIsModifyDialogOpen(true);
    } else {
      setIsModifyDialogOpen(false);
    }
  }, [tutorialStep]);

  return (
    <Dialog
      onOpenChange={open => setIsModifyDialogOpen(!open)}
      open={isModifyDialogOpen}
    >
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900/95 border border-cyan-900/50 max-h-[90vh] overflow-y-auto text-white"
        showClose={false}
      >
        <DialogHeader>
          <DialogTitle className="font-bold text-cyan-400 text-2xl">
            Player Actions
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gray-800/50 my-4 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-lg text-white">
            Modify a Tower
          </h3>
          <p>
            In order to beat level 1, you&apos;ll need to{' '}
            <span className="font-semibold text-blue-400">modify</span> a tower.
            To do this:
          </p>
          <ul className="mt-2 space-y-2 text-gray-200">
            <li className="flex gap-2 items-start">
              <div className="mt-1">•</div>
              <p>Install a tower</p>
            </li>
            <li className="flex gap-2 items-start">
              <div className="mt-1">•</div>
              <p>Click the assembly button</p>
            </li>
            <li className="flex gap-2 items-start">
              <div className="mt-1">•</div>
              <p>Select a patent you want to modify with</p>
            </li>
            <li className="flex gap-2 items-start">
              <div className="mt-1">•</div>
              <p>Click &quot;deploy&quot;</p>
            </li>
          </ul>
          <p className="mt-4">
            Don&apos;t worry if you don&apos;t quite understand these steps yet.
            We&apos;ll walk you through them next.
          </p>
        </div>

        <DialogFooter>
          <Button
            className="bg-cyan-800 hover:bg-cyan-700 text-white w-full"
            onClick={() => setIsModifyDialogOpen(false)}
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
