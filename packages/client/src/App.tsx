import { useComponentValue } from '@latticexyz/react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AsyncRevenueDialog } from '@/components/AsyncRevenueDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import { SolarFarmDialog } from '@/components/SolarFarmDialog';
import { Toaster } from '@/components/ui/sonner';
import { useMUD } from '@/hooks/useMUD';
import AppRoutes from '@/Routes';

export const App = (): JSX.Element => {
  const {
    components: { Username },
    network: { globalPlayerId },
  } = useMUD();
  const savedUsername = useComponentValue(Username, globalPlayerId)?.value;

  return (
    <Router>
      <Analytics />
      <AppRoutes />
      <SettingsDialog />
      {savedUsername && <SolarFarmDialog />}
      <AsyncRevenueDialog />
      <Toaster />
    </Router>
  );
};

export default App;
