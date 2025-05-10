import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { App } from '@/App';
import { ErrorFallback } from '@/components/ErrorFallback';
import { Explorer } from '@/mud/Explorer';
import { Providers } from '@/Providers';

createRoot(document.getElementById('react-root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Providers>
        <App />
        <Explorer />
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
);
