import { useComponentValue } from '@latticexyz/react';
import { SyncStep } from '@latticexyz/store-sync';
import { initialProgress } from '@latticexyz/store-sync/internal';
import { singletonEntity } from '@latticexyz/store-sync/recs';
import { useMemo } from 'react';

import { components } from '@/mud/recs';

export const useSyncStatus = (): {
  isLive: boolean;
  lastBlockNumberProcessed: bigint;
  latestBlockNumber: bigint;
  message: string;
  percentage: number;
  step: string;
} => {
  const progress = useComponentValue(
    components.SyncProgress,
    singletonEntity,
    initialProgress,
  );
  return useMemo(
    () => ({
      ...progress,
      isLive: progress.step === SyncStep.LIVE,
    }),
    [progress],
  );
};
