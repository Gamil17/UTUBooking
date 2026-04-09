import type { Metadata } from 'next';
import Link from 'next/link';
import CareerApplicationForm from '@/components/careers/CareerApplicationForm';

export const metadata: Metadata = {
  title: 'Apply — Careers | UTUBooking',
  description: 'Submit your application to join the UTUBooking team.',
};

interface Props {
  searchParams: Promise<{ role?: string }>;
}

export default async function CareersApplyPage({ searchParams }: Props) {
  const { role } = await searchParams;
  const roleName = role?.trim() || '';

  return (
    <div className="min-h-screen bg-utu-bg-page py-12 px-4">
      <div className="max-w-xl mx-auto">

        {/* Back link */}
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-blue transition-colors mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Careers
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-utu-text-primary">Apply for a Position</h1>
          {roleName ? (
            <p className="text-utu-text-muted text-sm mt-1">
              You&apos;re applying for{' '}
              <span className="font-semibold text-utu-text-primary">{roleName}</span>
            </p>
          ) : (
            <p className="text-utu-text-muted text-sm mt-1">
              No role selected.{' '}
              <Link href="/careers" className="text-utu-blue underline">
                View open positions
              </Link>
            </p>
          )}
        </div>

        {roleName ? (
          <CareerApplicationForm role={roleName} />
        ) : (
          <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-8 text-center">
            <p className="text-utu-text-muted text-sm mb-4">
              Please select a role from our open positions page to apply.
            </p>
            <Link
              href="/careers"
              className="inline-block bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              View Open Positions
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
