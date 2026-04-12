import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import AdminSignOut from './AdminSignOut';
import { AdminNav } from './AdminNav';
import WorkflowTaskBadge from './WorkflowTaskBadge';
import AdminAIChat from './AdminAIChat';

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
            <span className="text-xl font-bold text-utu-blue">UTUBooking</span>
            <span className="text-sm text-utu-text-muted">/</span>
            <span className="text-sm font-medium text-utu-text-primary">{t('revenueAdmin')}</span>
          </div>
          <div className="flex items-center gap-3">
            <WorkflowTaskBadge />
            <AdminSignOut />
          </div>
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
                { label: 'Bookings',               href: '/admin/bookings' },
                { label: 'Payments',               href: '/admin/payments' },
                { label: t('settings'),            href: '/admin/settings' },
              ],
            },
            {
              heading: t('emailAutomation'),
              items: [
                { label: t('incompleteBookings'), href: '/admin/notifications/incomplete' },
                { label: t('emailLog'),           href: '/admin/notifications/email-log' },
                { label: t('campaigns'),          href: '/admin/notifications/campaigns' },
                { label: 'Email Templates',       href: '/admin/notifications/templates' },
              ],
            },
            {
              heading: t('careersNav'),
              items: [
                { label: t('applications'), href: '/admin/careers/applications' },
                { label: 'Job Listings',    href: '/admin/careers/jobs' },
              ],
            },
            {
              heading: 'Loyalty',
              items: [
                { label: 'Loyalty Program', href: '/admin/loyalty' },
              ],
            },
            {
              heading: 'Wallet',
              items: [
                { label: 'Wallet Management', href: '/admin/wallet' },
              ],
            },
            {
              heading: 'Finance',
              items: [
                { label: 'Revenue & Refunds', href: '/admin/finance' },
              ],
            },
            {
              heading: 'Sales',
              items: [
                { label: 'CRM & Pipeline',    href: '/admin/sales' },
                { label: 'Corporate Travel',  href: '/admin/corporate' },
              ],
            },
            {
              heading: 'Business Development',
              items: [
                { label: 'Partnership Hub', href: '/admin/bizdev' },
                { label: 'Affiliates',      href: '/admin/affiliates' },
                { label: 'Advertising',     href: '/admin/advertising' },
              ],
            },
            {
              heading: 'Revenue Management',
              items: [
                { label: 'Yield & Pricing', href: '/admin/revenue' },
              ],
            },
            {
              heading: 'Customer Success',
              items: [
                { label: 'Account Health', href: '/admin/customer-success' },
              ],
            },
            {
              heading: 'Procurement',
              items: [
                { label: 'Suppliers & Contracts', href: '/admin/procurement' },
              ],
            },
            {
              heading: 'Fraud & Risk',
              items: [
                { label: 'Risk Management', href: '/admin/fraud' },
              ],
            },
            {
              heading: 'Analytics',
              items: [
                { label: 'BI Dashboard', href: '/admin/analytics' },
              ],
            },
            {
              heading: 'Marketing',
              items: [
                { label: 'Marketing Hub', href: '/admin/marketing' },
              ],
            },
            {
              heading: 'HR',
              items: [
                { label: 'HR Department', href: '/admin/hr' },
              ],
            },
            {
              heading: 'Compliance',
              items: [
                { label: 'Data & Privacy', href: '/admin/compliance' },
              ],
            },
            {
              heading: 'Legal',
              items: [
                { label: 'Legal & Contracts', href: '/admin/legal' },
              ],
            },
            {
              heading: 'Operations',
              items: [
                { label: 'Ops & Support', href: '/admin/ops' },
              ],
            },
            {
              heading: 'Development',
              items: [
                { label: 'Dev & Sprints', href: '/admin/dev' },
              ],
            },
            {
              heading: 'Products',
              items: [
                { label: 'Product Hub', href: '/admin/products' },
              ],
            },
            {
              heading: 'Content',
              items: [
                { label: 'Blog Posts',  href: '/admin/blog' },
                { label: 'Promo Codes', href: '/admin/promo-codes' },
              ],
            },
            {
              heading: 'Support',
              items: [
                { label: 'Contact Enquiries', href: '/admin/contact' },
                { label: 'AI Chat Logs',      href: '/admin/ai-chat' },
              ],
            },
            {
              heading: 'Inventory',
              items: [
                { label: 'Hotels / Flights / Cars', href: '/admin/inventory' },
                { label: 'Pending Approvals',       href: '/admin/pending-users' },
                { label: 'Audit Log',               href: '/admin/audit-log' },
                { label: 'Country Admins',          href: '/admin/country-admins' },
              ],
            },
            {
              heading: 'AI Intelligence',
              items: [
                { label: 'Daily Briefings',    href: '/admin/briefings' },
                { label: 'Document Generator', href: '/admin/documents' },
              ],
            },
            {
              heading: 'Workflow Engine',
              items: [
                { label: 'My Task Inbox', href: '/admin/tasks' },
                { label: 'Workflows',     href: '/admin/workflows' },
              ],
            },
            {
              heading: 'Infrastructure',
              items: [
                { label: 'Health Monitor', href: '/admin/infrastructure' },
                { label: 'White-label Tenants', href: '/admin/tenants' },
              ],
            },
            {
              heading: 'Help',
              items: [
                { label: 'User Manual', href: '/admin/help' },
              ],
            },
          ]} />
        </nav>
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Floating AI assistant — Client Component, present on every admin page */}
      <AdminAIChat />
    </div>
  );
}
