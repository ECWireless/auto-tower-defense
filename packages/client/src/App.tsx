import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter as Router } from 'react-router-dom';

import { MusicManager } from '@/components/MusicManager';
import { Toaster } from '@/components/ui/sonner';
import AppRoutes from '@/Routes';

export const App = (): JSX.Element => {
  return (
    <Router>
      <Analytics />
      <AppRoutes />
      <MusicManager />
      <Toaster />
    </Router>
  );
};

export default App;
