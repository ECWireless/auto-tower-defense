import { useComponentValue } from '@latticexyz/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMUD } from '@/hooks/useMUD';

export const InstallInfoDialog: React.FC = () => {
  const {
    components: { TutorialProgress },
    network: { globalPlayerId },
  } = useMUD();

  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);

  const tutorialProgress = useComponentValue(TutorialProgress, globalPlayerId);

  useEffect(() => {
    if (!tutorialProgress) return;
    if (
      tutorialProgress.step1Completed &&
      tutorialProgress.step2Completed &&
      !tutorialProgress.step3Completed
    ) {
      setIsInstallDialogOpen(true);
    } else {
      setIsInstallDialogOpen(false);
    }
  }, [tutorialProgress]);

  return (
    <Dialog
      onOpenChange={open => setIsInstallDialogOpen(!open)}
      open={isInstallDialogOpen}
    >
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900/95 border border-cyan-900/50 max-h-[90vh] overflow-y-auto text-white"
      >
        <DialogHeader>
          <DialogTitle className="font-bold text-cyan-400 text-2xl">
            Player Actions
          </DialogTitle>
        </DialogHeader>

        <div className="bg-gray-800/50 my-4 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-lg text-white">
            Install a Tower
          </h3>
          <p>
            On your turn, you can perform 3 types of{' '}
            <span className="font-semibold text-blue-400">actions</span>:
          </p>
          <ul className="mt-2 space-y-2 text-gray-200">
            <li className="flex gap-2 items-start">
              <div className="mt-1">•</div>
              <p>Install</p>
            </li>
            <li className="flex gap-2 items-start">
              <div className="mt-1">•</div>
              <p>Move</p>
            </li>
            <li className="flex gap-2 items-start">
              <div className="mt-1">•</div>
              <p>Modify</p>
            </li>
          </ul>
          <p className="mt-4">
            We&apos;ll deal with &quot;modify&quot; actions later, but for now,
            go ahead and install a tower to beat level 0.
          </p>
        </div>

        <DialogFooter>
          <Button
            className="bg-cyan-800 hover:bg-cyan-700 text-white w-full"
            onClick={() => setIsInstallDialogOpen(false)}
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
