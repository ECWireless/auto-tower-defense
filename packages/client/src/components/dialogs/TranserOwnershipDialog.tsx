import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { isAddress } from 'viem';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/SettingsContext';
import { useMUD } from '@/hooks/useMUD';

type TransferOwnershipProps = {
  isTransferDialogOpen: boolean;
  setIsTransferDialogOpen: (open: boolean) => void;
};

export const TransferOwnershipDialog: React.FC<TransferOwnershipProps> = ({
  isTransferDialogOpen,
  setIsTransferDialogOpen,
}) => {
  const {
    systemCalls: { transferAccount },
  } = useMUD();
  const { playSfx } = useSettings();

  const [newOwner, setNewOwner] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const ownerError = useMemo(() => {
    if (!newOwner) return null;
    if (!isAddress(newOwner)) return 'Invalid address';
    return null;
  }, [newOwner]);

  const isDisabled = useMemo(() => {
    return !newOwner || !!ownerError || isTransferring;
  }, [newOwner, ownerError, isTransferring]);

  const onTransferAccount = useCallback(async () => {
    try {
      setIsTransferring(true);
      playSfx('click2');

      const { error, success } = await transferAccount(
        newOwner as `0x${string}`,
      );

      if (error && !success) {
        throw new Error(error);
      }

      toast.success('Ownership Transferred!');

      // do a full refresh to reset state
      window.location.href = '/';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Smart contract error: ${(error as Error).message}`);

      toast.error('Error Transferring Ownership', {
        description: (error as Error).message,
      });
    } finally {
      setIsTransferring(false);
    }
  }, [newOwner, playSfx, transferAccount]);

  return (
    <Dialog
      open={isTransferDialogOpen}
      onOpenChange={open => setIsTransferDialogOpen(open)}
    >
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900 border border-red-900/50 text-white"
      >
        <DialogHeader>
          <DialogTitle className="text-red-400 text-2xl">
            Transfer Account Ownership
          </DialogTitle>
        </DialogHeader>
        <p> Ensure that you are pasting the correct address.</p>
        <div className="flex justify-center my-4">
          <AlertTriangle className="h-16 text-red-400 w-16" />
        </div>
        <div className="mb-4 space-y-2">
          <Label className="text-gray-300 text-sm" htmlFor="owner">
            New Owner Address (0x...)
          </Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white"
            disabled={false}
            id="owner"
            onChange={e => setNewOwner(e.target.value)}
            required
            type="text"
            value={newOwner}
          />
          {ownerError && (
            <div className="text-red-500 text-sm ">{ownerError}</div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-4 sm:justify-center">
          <Button
            onClick={() => setIsTransferDialogOpen(false)}
            className="border-red-500 hover:bg-red-950/50 hover:text-red-300 text-red-400 w-full"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="bg-red-800 hover:bg-red-700 text-white w-full"
            disabled={isDisabled}
            onClick={onTransferAccount}
          >
            {isTransferring && <Loader2 className="animate-spin h-6 w-6" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
