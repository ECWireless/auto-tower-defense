import { Route, Routes } from 'react-router-dom';

import { LoadingScreen } from '@/components/LoadingScreen';
import { Synced } from '@/mud/Synced';
import { BattlePage } from '@/pages/Battle';
import { Home } from '@/pages/Home';

export const HOME_PATH = '/';
export const BATTLES_PATH = '/battles';

const AppRoutes: React.FC = () => {
  return (
    <Synced
      fallback={({ percentage }) => (
        <LoadingScreen width={Math.round(percentage)} />
      )}
    >
      <Routes>
        <Route path={HOME_PATH} element={<Home />} />
        <Route path={`${BATTLES_PATH}/:id`} element={<BattlePage />} />
      </Routes>
    </Synced>
  );
};

export default AppRoutes;
