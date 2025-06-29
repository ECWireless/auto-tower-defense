import { ComponentValue } from '@latticexyz/recs';
import { ReactNode } from 'react';

import { components } from '@/mud/recs';
import { useSyncStatus } from '@/mud/useSyncStatus';

export type SyncedProps = {
  children: ReactNode;
  fallback?: (
    props: ComponentValue<(typeof components)['SyncProgress']['schema']>,
  ) => ReactNode;
};

export const Synced = ({ children, fallback }: SyncedProps): ReactNode => {
  const status = useSyncStatus();
  // TODO: Remove temporary workaround once indexer issue is resolved
  // return status.isLive ? children : fallback?.(status);
  return status.latestBlockNumber > 0n &&
    status.lastBlockNumberProcessed >= status.latestBlockNumber - 4n
    ? children
    : fallback?.(status);
};
