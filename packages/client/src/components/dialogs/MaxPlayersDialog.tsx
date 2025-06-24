import { Signal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MAX_PLAYERS } from '@/utils/constants';

type MaxPlayersDialogProps = {
  isMaxPlayersDialogOpen: boolean;
  setIsMaxPlayersDialogOpen: (open: boolean) => void;
};

export const MaxPlayersDialog: React.FC<MaxPlayersDialogProps> = ({
  isMaxPlayersDialogOpen,
  setIsMaxPlayersDialogOpen,
}) => {
  return (
    <Dialog
      onOpenChange={open => setIsMaxPlayersDialogOpen(open)}
      open={isMaxPlayersDialogOpen}
    >
      <DialogContent className="bg-gray-900/95 border border-amber-900/50 text-white">
        <DialogHeader>
          <DialogTitle className="font-bold text-amber-400 text-2xl">
            Max Players Reached
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="mt-2 text-gray-300">
          The maximum number of players ({MAX_PLAYERS}) has been reached. Please
          try again later when more slots become available.
        </DialogDescription>
        <div className="flex justify-center my-4">
          <Signal className="h-16 text-amber-400 w-16" />
        </div>
        <div className="mt-2 text-center">
          <Button
            onClick={() => setIsMaxPlayersDialogOpen(false)}
            className="bg-amber-800 hover:bg-amber-700 text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
