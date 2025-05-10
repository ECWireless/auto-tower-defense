import { useEntityQuery } from '@latticexyz/react';
import { getComponentValueStrict, HasValue } from '@latticexyz/recs';
import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMUD } from '@/hooks/useMUD';
import { formatWattHours } from '@/utils/helpers';

const ASYNC_REVENUE_TIMESTAMP_KEY = 'async-kingdom-revenue-timestamp';

const formatTime = (time: number): string => {
  if (time < 60) {
    return `${time} seconds`;
  }
  if (time < 3600) {
    const minutes = Math.floor(time / 60);
    return `${minutes} minutes`;
  }
  if (time < 86400) {
    const hours = Math.floor(time / 3600);
    return `${hours} hours`;
  }

  const days = Math.floor(time / 86400);
  return `${days} days`;
};

export const AsyncRevenueDialog: React.FC = () => {
  const { address: playerAddress } = useAccount();
  const {
    components: { RevenueReceipt },
  } = useMUD();

  const [isAsyncRevenueDialogOpen, setIsAsyncRevenueDialogOpen] =
    useState(false);
  const [revenueSinceTimestamp, setRevenueSinceTimestamp] = useState(BigInt(0));
  const [timeSinceLastCheck, setTimeSinceLastCheck] = useState<string>('');

  const revenueReceipts = useEntityQuery([
    HasValue(RevenueReceipt, {
      playerAddress,
    }),
  ]).map(receiptId => getComponentValueStrict(RevenueReceipt, receiptId));

  useEffect(() => {
    let lastTimestamp = localStorage.getItem(ASYNC_REVENUE_TIMESTAMP_KEY);

    if (!lastTimestamp) {
      lastTimestamp = Date.now().toString();
      localStorage.setItem(ASYNC_REVENUE_TIMESTAMP_KEY, lastTimestamp);
    }

    const lastTimestampDate = new Date(Number(lastTimestamp));
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    if (lastTimestampDate > tenMinutesAgo) return;

    const filteredReceipts = revenueReceipts.filter(receipt => {
      const receiptDate = new Date(Number(receipt.timestamp) * 1000);
      return receiptDate > lastTimestampDate;
    });

    if (filteredReceipts.length === 0) return;

    const totalAmountToReserve = filteredReceipts.reduce(
      (acc, receipt) => acc + BigInt(receipt.amountToReserve),
      BigInt(0),
    );

    setRevenueSinceTimestamp(totalAmountToReserve);
    const timeSinceLastCheck = Math.floor(
      (now.getTime() - lastTimestampDate.getTime()) / 1000,
    );
    setTimeSinceLastCheck(formatTime(timeSinceLastCheck));

    localStorage.setItem(ASYNC_REVENUE_TIMESTAMP_KEY, now.getTime().toString());
    setIsAsyncRevenueDialogOpen(true);
  }, [revenueReceipts]);

  return (
    <Dialog
      open={isAsyncRevenueDialogOpen}
      onOpenChange={open => setIsAsyncRevenueDialogOpen(open)}
    >
      <DialogContent className="bg-gray-900 border border-blue-900/50 max-h-[90vh] overflow-y-auto text-white">
        <DialogHeader>
          <DialogTitle className="text-blue-400 text-xl">
            Revenue Earned
          </DialogTitle>
          <DialogDescription className="mt-2 text-gray-300">
            Congrats! Your kingdoms have earned you{' '}
            <strong>{formatWattHours(revenueSinceTimestamp)}</strong> in the
            last <strong>{timeSinceLastCheck}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-6">
          <div className="flex justify-center">
            <Zap className="h-16 text-blue-400 w-16" />
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            onClick={() => setIsAsyncRevenueDialogOpen(false)}
            className="bg-blue-800 hover:bg-blue-700 text-white w-full"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
