/**
 * CCPAFooterLink
 *
 * Renders "Do Not Sell My Personal Information" footer link for US users.
 * Required by California Consumer Privacy Act (CCPA/CPRA) when:
 *   - Annual revenue > $25M, OR
 *   - Processing data of 100,000+ CA consumers, OR
 *   - 50%+ revenue from selling CA consumer data
 *
 * UTUBooking will meet these thresholds at scale — include the link
 * before CA launch as a proactive compliance measure.
 *
 * This is a server component (no 'use client') — rendered once, no interactivity.
 * Only shown when countryCode === 'US'.
 */

interface Props {
  countryCode?: string;
}

export default function CCPAFooterLink({ countryCode }: Props) {
  if (countryCode !== 'US') return null;

  return (
    <div className="text-center text-xs text-gray-400 py-2 border-t border-gray-100">
      <a
        href="/privacy#ccpa"
        className="hover:text-gray-600 underline"
        aria-label="Do Not Sell or Share My Personal Information — California Privacy Rights"
      >
        Do Not Sell or Share My Personal Information
      </a>
      {' · '}
      <a
        href="/privacy#ccpa"
        className="hover:text-gray-600 underline"
      >
        California Privacy Rights
      </a>
    </div>
  );
}
