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
  return status.isLive ? children : fallback?.(status);
  // Use if indexer is lagging behind
  // return status.latestBlockNumber > 0n &&
  //   status.lastBlockNumberProcessed >= status.latestBlockNumber - 4n
  //   ? children
  //   : fallback?.(status);
};
