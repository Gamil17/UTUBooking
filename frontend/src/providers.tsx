'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AiChatWidget } from '@/components/AiChat';
import { AppProgressBar } from 'next-nprogress-bar';
import { RTLProvider, type Direction } from '@/components/layout/RTLProvider';
import { ToastProvider } from '@/components/ui/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Each browser session gets its own QueryClient instance to avoid
  // sharing state between requests on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            60_000,  // 1 min — re-fetch after this
            gcTime:               300_000, // 5 min — keep in memory
            retry:                1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Read dir from <html> synchronously on first render so RTLProvider matches
  // the locale direction already applied server-side. No effect needed.
  const [defaultDir] = useState<Direction>(() => {
    if (typeof document === 'undefined') return 'ltr';
    const d = document.documentElement.dir;
    return d === 'rtl' ? 'rtl' : 'ltr';
  });

  return (
    <RTLProvider defaultDir={defaultDir}>
      <ToastProvider dir={defaultDir}>
        <QueryClientProvider client={queryClient}>
          {children}
          <AiChatWidget />
          <AppProgressBar
            height="3px"
            color="#10B981" /* EXCEPTION: brand progress bar — matches site primary until navy migration */
            options={{ showSpinner: false }}
          />
        </QueryClientProvider>
      </ToastProvider>
    </RTLProvider>
  );
}
