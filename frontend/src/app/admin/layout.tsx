import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import AdminSignOut from './AdminSignOut';
import { AdminNav } from './AdminNav';

/**
 * Admin shell layout — Server Component.
 *
 * Auth is enforced by middleware.ts (checks utu_admin_token cookie against
 * ADMIN_SECRET before any layout runs). This layout just provides the shell UI.
 * /admin/login is exempt from the middleware guard and renders without this layout
 * because Next.js middleware redirects unauthenticated visitors there first.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('admin');
  return (
    <div className="min-h-screen bg-utu-bg-muted">
      {/* Admin top bar */}
      <header className="border-b border-utu-border-default bg-utu-bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-emerald-600">UTUBooking</span>
            <span className="text-sm text-utu-text-muted">/</span>
            <span className="text-sm font-medium text-utu-text-primary">{t('revenueAdmin')}</span>
          </div>
          <AdminSignOut />
        </div>
      </header>

      {/* Side nav + content */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="w-52 shrink-0">
          <AdminNav sections={[
            {
              items: [
                { label: t('revenueOptimization'), href: '/admin' },
                { label: t('analytics'),           href: '/admin/analytics' },
                { label: t('users'),               href: '/admin/users' },
                { label: t('settings'),            href: '/admin/settings' },
              ],
            },
            {
              heading: t('emailAutomation'),
              items: [
                { label: t('incompleteBookings'), href: '/admin/notifications/incomplete' },
                { label: t('emailLog'),           href: '/admin/notifications/email-log' },
                { label: t('campaigns'),          href: '/admin/notifications/campaigns' },
              ],
            },
          ]} />
        </nav>
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
