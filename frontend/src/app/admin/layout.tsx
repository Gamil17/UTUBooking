import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminSignOut from './AdminSignOut';

/**
 * Admin shell layout — Server Component.
 *
 * Auth is enforced by middleware.ts (checks utu_admin_token cookie against
 * ADMIN_SECRET before any layout runs). This layout just provides the shell UI.
 * /admin/login is exempt from the middleware guard and renders without this layout
 * because Next.js middleware redirects unauthenticated visitors there first.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Admin top bar */}
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-[#10B981]">UTUBooking</span>
            <span className="text-sm text-[#6B7280]">/</span>
            <span className="text-sm font-medium text-[#111827]">Revenue Admin</span>
          </div>
          <AdminSignOut />
        </div>
      </header>

      {/* Side nav + content */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="w-52 shrink-0">
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/admin" className="block rounded-md px-3 py-2 font-medium text-[#111827] hover:bg-[#F3F4F6]">
                Revenue Optimization
              </Link>
            </li>
            <li className="pt-3 pb-1 px-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Email Automation
            </li>
            <li>
              <Link href="/admin/notifications/incomplete" className="block rounded-md px-3 py-2 text-[#374151] hover:bg-[#F3F4F6]">
                Incomplete Bookings
              </Link>
            </li>
            <li>
              <Link href="/admin/notifications/email-log" className="block rounded-md px-3 py-2 text-[#374151] hover:bg-[#F3F4F6]">
                Email Log
              </Link>
            </li>
            <li>
              <Link href="/admin/notifications/campaigns" className="block rounded-md px-3 py-2 text-[#374151] hover:bg-[#F3F4F6]">
                Campaigns
              </Link>
            </li>
          </ul>
        </nav>
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
