import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/api';
import { SessionProvider } from '@/lib/session';
import { PrefsProvider } from '@/lib/prefs';
import { ToastProvider } from '@/lib/toast';
import App from './App';
import './index.css';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 },
  },
});

// Sandboxed previews cannot change the address bar, so they use an in-memory router.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <QueryClientProvider client={qc}>
        <SessionProvider>
          <PrefsProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </PrefsProvider>
        </SessionProvider>
      </QueryClientProvider>
    </Router>
  </StrictMode>,
);
