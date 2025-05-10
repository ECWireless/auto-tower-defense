import { Route, Routes } from 'react-router-dom';

import { LoadingScreen } from '@/components/LoadingScreen';
import { Synced } from '@/mud/Synced';
import { GamePage } from '@/pages/Game';
import { Home } from '@/pages/Home';

export const HOME_PATH = '/';
export const GAMES_PATH = '/games';

const AppRoutes: React.FC = () => {
  return (
    <Synced
      fallback={({ percentage }) => (
        <LoadingScreen width={Math.round(percentage)} />
      )}
    >
      <Routes>
        <Route path={HOME_PATH} element={<Home />} />
        <Route path={`${GAMES_PATH}/:id`} element={<GamePage />} />
      </Routes>
    </Synced>
  );
};

export default AppRoutes;
