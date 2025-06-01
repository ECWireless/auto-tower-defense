import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBattle } from '@/contexts/BattleContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useMUD } from '@/hooks/useMUD';
import { HOME_PATH } from '@/Routes';

import { Button } from './ui/button';

type ForfeitDialogProps = {
  isForfeitDialogOpen: boolean;
  setIsForfeitDialogOpen: (open: boolean) => void;
};

export const ForfeitDialog: React.FC<ForfeitDialogProps> = ({
  isForfeitDialogOpen,
  setIsForfeitDialogOpen,
}) => {
  const navigate = useNavigate();
  const {
    systemCalls: { forfeitRun },
  } = useMUD();
  const { playSfx } = useSettings();
  const { battle } = useBattle();

  const [isForfeiting, setIsForfeiting] = useState(false);

  const onForfeitRun = useCallback(async () => {
    try {
      setIsForfeiting(true);
      playSfx('click2');

      if (!battle) {
        throw new Error('Battle not found.');
      }

      const { error, success } = await forfeitRun();

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Run Forfeited!');
      navigate(HOME_PATH);
      setIsForfeitDialogOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Forfeiting Run', {
        description: (error as Error).message,
      });
    } finally {
      setIsForfeiting(false);
    }
  }, [battle, forfeitRun, navigate, playSfx, setIsForfeitDialogOpen]);

  return (
    <Dialog
      open={isForfeitDialogOpen}
      onOpenChange={open => setIsForfeitDialogOpen(open)}
    >
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900 border border-red-900/50 text-white"
      >
        <DialogHeader>
          <DialogTitle className="text-red-400 text-xl">
            Forfeit Battle Run
          </DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to forfeit?</p>
        <p className="font-semibold mt-2">
          Forfeiting will reset your run back to level 0.
        </p>
        <div className="flex justify-center my-4">
          <AlertTriangle className="h-16 w-16 text-red-400" />
        </div>
        <DialogFooter className="gap-2 sm:justify-center sm:gap-4">
          <Button
            onClick={() => setIsForfeitDialogOpen(false)}
            className="border-red-500 hover:bg-red-950/50 hover:text-red-300 text-red-400 w-full"
            variant="outline"
          >
            Close
          </Button>
          <Button
            className="bg-red-800 hover:bg-red-700 text-white w-full"
            disabled={isForfeiting}
            onClick={onForfeitRun}
          >
            {isForfeiting && <Loader2 className="animate-spin h-6 w-6" />}
            Forfeit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
