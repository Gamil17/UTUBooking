import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Admin shell layout.
 * Server component — reads ADMIN_SECRET at request time (never exposed to client).
 * Access is controlled by the x-admin-token cookie set on login (not implemented here —
 * for now the env check ensures the route only works in deployed envs with ADMIN_SECRET set).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  // Guard: ADMIN_SECRET must be configured for the admin section to be accessible
  if (!process.env.ADMIN_SECRET) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Admin top bar */}
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-[#10B981]">UTUBooking</span>
          <span className="text-sm text-[#6B7280]">/</span>
          <span className="text-sm font-medium text-[#111827]">Revenue Admin</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
