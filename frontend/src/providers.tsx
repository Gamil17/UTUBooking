'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AiChatWidget } from '@/components/AiChat';

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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <AiChatWidget />
    </QueryClientProvider>
  );
}
