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
 * Also displays the California Seller of Travel (CST) registration number,
 * required under California Business & Professions Code §17550.
 * Registration: California Attorney General / Seller of Travel Program.
 * Replace CST_NUMBER below once the registration certificate is issued.
 *
 * This is a server component (no 'use client') — rendered once, no interactivity.
 * Only shown when countryCode === 'US'.
 */

/**
 * California Seller of Travel registration number.
 * REQUIRED before CA launch: set NEXT_PUBLIC_CA_CST_NUMBER in your environment.
 * Apply at: oag.ca.gov/travel
 * WARNING: Do NOT deploy to California users until a real CST number is set.
 */
const CST_NUMBER = process.env.NEXT_PUBLIC_CA_CST_NUMBER ?? '2000000-40';

if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_CA_CST_NUMBER) {
  console.warn(
    '[CCPAFooterLink] NEXT_PUBLIC_CA_CST_NUMBER is not set. ' +
    'Using placeholder "2000000-40". Set a real CST number before CA launch.'
  );
}

interface Props {
  countryCode?: string;
}

export default function CCPAFooterLink({ countryCode }: Props) {
  if (countryCode !== 'US') return null;

  return (
    <div className="text-center text-xs text-utu-text-muted py-2 border-t border-utu-border-default space-y-1">
      <div>
        <a
          href="/privacy/ccpa-opt-out"
          className="hover:text-utu-text-secondary underline"
          aria-label="Do Not Sell or Share My Personal Information — California Privacy Rights"
        >
          Do Not Sell or Share My Personal Information
        </a>
        {' · '}
        <a
          href="/privacy#ccpa"
          className="hover:text-utu-text-secondary underline"
        >
          California Privacy Rights
        </a>
      </div>
      <div aria-label={`California Seller of Travel Registration Number ${CST_NUMBER}`}>
        California Seller of Travel Reg. No.{' '}
        <span className="font-medium text-utu-text-muted">{CST_NUMBER}</span>
      </div>
    </div>
  );
}
