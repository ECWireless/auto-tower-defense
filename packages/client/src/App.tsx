import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter as Router } from 'react-router-dom';

import { SettingsDialog } from '@/components/SettingsDialog';
import { Toaster } from '@/components/ui/sonner';
import AppRoutes from '@/Routes';

export const App = (): JSX.Element => {
  return (
    <Router>
      <Analytics />
      <AppRoutes />
      <SettingsDialog />
      <Toaster />
    </Router>
  );
};

export default App;
