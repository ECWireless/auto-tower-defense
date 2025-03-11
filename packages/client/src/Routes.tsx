import { useComponentValue } from '@latticexyz/react';
import { SyncStep } from '@latticexyz/store-sync';
import { singletonEntity } from '@latticexyz/store-sync/recs';
import { Route, Routes } from 'react-router-dom';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useMUD } from '@/MUDContext';
import { GamePage } from '@/pages/Game';
import { Home } from '@/pages/Home';

export const HOME_PATH = '/';
export const GAMES_PATH = '/games';

const AppRoutes: React.FC = () => {
  const {
    components: { SyncProgress },
  } = useMUD();

  const syncProgress = useComponentValue(SyncProgress, singletonEntity);

  if (syncProgress && syncProgress.step !== SyncStep.LIVE) {
    return <LoadingScreen width={Math.round(syncProgress.percentage)} />;
  }

  return (
    <Routes>
      <Route path={HOME_PATH} element={<Home />} />
      <Route path={`${GAMES_PATH}/:id`} element={<GamePage />} />
    </Routes>
  );
};

export default AppRoutes;
