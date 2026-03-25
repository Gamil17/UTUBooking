/**
 * /privacy — Privacy Policy page
 *
 * Covers GDPR (EU/UK), KVKK (Turkey), and DPDP (India).
 * Server component — no client-side JS needed; static HTML.
 * SEO-indexed; linked from all three consent banners.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — UTUBooking',
  description:
    'How UTUBooking collects, uses and protects your personal data under GDPR, KVKK, DPDP and CCPA.',
  robots: 'index, follow',
};

// ── Shared style tokens (inline — no Tailwind dependency for legal pages) ──────
const S = {
  page: {
    maxWidth:   800,
    margin:     '0 auto',
    padding:    '40px 24px 80px',
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    color:      '#111827',
    lineHeight: 1.75,
    fontSize:   15,
  } as React.CSSProperties,
  h1: {
    fontSize:     28,
    fontWeight:   800,
    color:        '#111827',
    marginBottom: 4,
  } as React.CSSProperties,
  meta: {
    color:        '#6B7280',
    fontSize:     13,
    marginBottom: 32,
  } as React.CSSProperties,
  h2: {
    fontSize:     18,
    fontWeight:   700,
    color:        '#111827',
    marginTop:    36,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '2px solid #10B981',
  } as React.CSSProperties,
  h3: {
    fontSize:     15,
    fontWeight:   700,
    color:        '#374151',
    marginTop:    20,
    marginBottom: 6,
  } as React.CSSProperties,
  p: {
    marginBottom: 12,
    color:        '#374151',
  } as React.CSSProperties,
  table: {
    width:          '100%',
    borderCollapse: 'collapse' as const,
    marginBottom:   20,
    fontSize:       14,
  } as React.CSSProperties,
  th: {
    backgroundColor: '#F3F4F6',
    padding:         '8px 12px',
    textAlign:       'left' as const,
    fontWeight:      600,
    borderBottom:    '1px solid #E5E7EB',
    color:           '#374151',
  } as React.CSSProperties,
  td: {
    padding:      '8px 12px',
    borderBottom: '1px solid #F3F4F6',
    verticalAlign: 'top' as const,
    color:        '#4B5563',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display:         'inline-block',
    backgroundColor: color,
    color:           '#fff',
    fontSize:        11,
    fontWeight:      700,
    padding:         '2px 8px',
    borderRadius:    4,
    marginRight:     6,
  } as React.CSSProperties),
  callout: {
    backgroundColor: '#F0FDF4',
    border:          '1px solid #86EFAC',
    borderRadius:    8,
    padding:         '14px 18px',
    marginBottom:    20,
    fontSize:        14,
    color:           '#166534',
  } as React.CSSProperties,
  link: {
    color:          '#10B981',
    textDecoration: 'underline',
  } as React.CSSProperties,
  divider: {
    border:       'none',
    borderTop:    '1px solid #E5E7EB',
    margin:       '32px 0',
  } as React.CSSProperties,
} as const;

export default function PrivacyPage() {
  return (
    <main style={S.page}>
      <h1 style={S.h1}>Privacy Policy</h1>
      <p style={S.meta}>
        Last updated: 24 March 2026 · Version 1.0 ·{' '}
        <a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a>
      </p>

      <div style={S.callout}>
        <strong>Applicable laws:</strong>{' '}
        <span style={S.badge('#2563EB')}>GDPR (EU/UK)</span>
        <span style={S.badge('#D97706')}>KVKK (Turkey)</span>
        <span style={S.badge('#7C3AED')}>DPDP 2023 (India)</span>
        <span style={S.badge('#1D4ED8')}>CCPA (California)</span>
        This policy applies to all UTUBooking users. Jurisdiction-specific sections are
        labelled with the badge above.
      </div>

      {/* 1 ─ Who we are */}
      <h2 style={S.h2}>1. Who We Are</h2>
      <p style={S.p}>
        <strong>UTUBooking Ltd</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is the data controller for personal
        data collected through utubooking.com and our mobile apps.
      </p>
      <table style={S.table}>
        <tbody>
          <tr><td style={S.td}><strong>Data Protection Officer</strong></td><td style={S.td}><a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a></td></tr>
          <tr><td style={S.td}><strong>KVKK Contact</strong></td><td style={S.td}><a href="mailto:kvkk@utubooking.com" style={S.link}>kvkk@utubooking.com</a></td></tr>
          <tr><td style={S.td}><strong>Response time</strong></td><td style={S.td}>30 days (GDPR Art. 12 / KVKK md.13 / DPDP §12)</td></tr>
          <tr><td style={S.td}><strong>Registered address</strong></td><td style={S.td}>[UTUBooking Ltd registered address]</td></tr>
        </tbody>
      </table>

      {/* 2 ─ Data collected */}
      <h2 style={S.h2}>2. What Data We Collect</h2>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Category</th>
            <th style={S.th}>Examples</th>
            <th style={S.th}>Why collected</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={S.td}><strong>Identity</strong></td>
            <td style={S.td}>Name, nationality, passport number</td>
            <td style={S.td}>Booking fulfilment; Hajj/Umrah regulatory requirements</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Contact</strong></td>
            <td style={S.td}>Email address, phone number</td>
            <td style={S.td}>Booking confirmation, customer support</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Payment</strong></td>
            <td style={S.td}>Card last 4 digits, gateway transaction ID</td>
            <td style={S.td}>Payment processing (card data handled by PCI-DSS certified gateways)</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Usage</strong> (consent)</td>
            <td style={S.td}>Pages visited, search queries, booking funnel</td>
            <td style={S.td}>Analytics — only with your explicit consent</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Technical</strong></td>
            <td style={S.td}>IP address, browser type, device ID</td>
            <td style={S.td}>Security, fraud prevention, consent audit</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Religious context</strong></td>
            <td style={S.td}>Hajj / Umrah booking implies religious practice</td>
            <td style={S.td}>Explicit consent obtained (GDPR Art. 9(2)(a))</td>
          </tr>
        </tbody>
      </table>
      <p style={S.p}>
        We do <strong>not</strong> collect: precise GPS location, biometric data,
        or racial/ethnic origin beyond nationality.
      </p>

      {/* 3 ─ Legal basis */}
      <h2 style={S.h2}>3. Legal Basis for Processing</h2>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Processing</th>
            <th style={S.th}>Legal Basis</th>
            <th style={S.th}>Reference</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={S.td}>Booking fulfilment</td><td style={S.td}>Contract performance</td><td style={S.td}>GDPR Art. 6(1)(b) / KVKK md.5/2(c)</td></tr>
          <tr><td style={S.td}>Account management</td><td style={S.td}>Contract performance</td><td style={S.td}>GDPR Art. 6(1)(b)</td></tr>
          <tr><td style={S.td}>Tax records (7 years)</td><td style={S.td}>Legal obligation</td><td style={S.td}>GDPR Art. 6(1)(c)</td></tr>
          <tr><td style={S.td}>Analytics cookies</td><td style={S.td}>Your consent</td><td style={S.td}>GDPR Art. 6(1)(a) / DPDP §6</td></tr>
          <tr><td style={S.td}>Marketing communications</td><td style={S.td}>Your consent</td><td style={S.td}>GDPR Art. 6(1)(a) / KVKK md.5/1</td></tr>
          <tr><td style={S.td}>Fraud prevention</td><td style={S.td}>Legitimate interest</td><td style={S.td}>GDPR Art. 6(1)(f)</td></tr>
          <tr><td style={S.td}>AI pricing (aggregate)</td><td style={S.td}>Legitimate interest (no PII enters AI)</td><td style={S.td}>GDPR Art. 6(1)(f) — DPIA conducted</td></tr>
          <tr><td style={S.td}>Religious data (Hajj context)</td><td style={S.td}>Explicit consent</td><td style={S.td}>GDPR Art. 9(2)(a)</td></tr>
        </tbody>
      </table>

      {/* 4 ─ Retention */}
      <h2 style={S.h2}>4. How Long We Keep Your Data</h2>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Data category</th>
            <th style={S.th}>Retention period</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={S.td}>Booking records</td><td style={S.td}>Contract duration + 7 years (tax law)</td></tr>
          <tr><td style={S.td}>Account profile</td><td style={S.td}>While account is active + 30 days post-deletion</td></tr>
          <tr><td style={S.td}>Payment records</td><td style={S.td}>7 years (financial regulation)</td></tr>
          <tr><td style={S.td}>Analytics data</td><td style={S.td}>13 months</td></tr>
          <tr><td style={S.td}>Consent audit log</td><td style={S.td}>Permanent (GDPR Art. 7(1) — we must prove consent)</td></tr>
          <tr><td style={S.td}>Erasure request log</td><td style={S.td}>7 years post-completion (Art. 17(3)(e))</td></tr>
          <tr><td style={S.td}>Marketing data</td><td style={S.td}>Until consent withdrawn</td></tr>
        </tbody>
      </table>

      {/* 5 ─ Data sharing */}
      <h2 style={S.h2}>5. Who We Share Your Data With</h2>
      <p style={S.p}>
        We share your data only where necessary for service delivery. We never sell your data.
      </p>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Recipient</th>
            <th style={S.th}>Purpose</th>
            <th style={S.th}>DPA</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={S.td}>Payment gateways (Stripe, STC Pay, Iyzico, Midtrans, iPay88, JazzCash, Easypaisa)</td><td style={S.td}>Payment processing</td><td style={S.td}>Stripe: ✅ SCCs · Others: contractual restrictions</td></tr>
          <tr><td style={S.td}>Hotelbeds API</td><td style={S.td}>Hotel inventory</td><td style={S.td}>Booking data only</td></tr>
          <tr><td style={S.td}>Amazon Web Services</td><td style={S.td}>Cloud infrastructure</td><td style={S.td}>AWS DPA + SCCs</td></tr>
          <tr><td style={S.td}>Anthropic (Claude AI)</td><td style={S.td}>Pricing model — aggregated metrics only, no PII</td><td style={S.td}>DPA in progress</td></tr>
          <tr><td style={S.td}>Legal authorities</td><td style={S.td}>When required by law (court order, etc.)</td><td style={S.td}>N/A</td></tr>
        </tbody>
      </table>

      {/* 6 ─ International transfers */}
      <h2 style={S.h2}>6. International Transfers</h2>
      <p style={S.p}>
        Your data may be processed in these locations, each with an appropriate safeguard:
      </p>
      <table style={S.table}>
        <thead>
          <tr><th style={S.th}>Location</th><th style={S.th}>Shard</th><th style={S.th}>Safeguard</th></tr>
        </thead>
        <tbody>
          <tr><td style={S.td}>AWS Frankfurt (eu-central-1)</td><td style={S.td}>EU/TR users</td><td style={S.td}>Within EU — no transfer mechanism needed</td></tr>
          <tr><td style={S.td}>AWS Bahrain (me-south-1)</td><td style={S.td}>KSA/UAE/KWT/JOR/MAR/TUN users</td><td style={S.td}>Standard Contractual Clauses (SCCs)</td></tr>
          <tr><td style={S.td}>AWS Mumbai (ap-south-1)</td><td style={S.td}>IN/PK users</td><td style={S.td}>DPDP data localisation compliant</td></tr>
        </tbody>
      </table>
      <p style={S.p}>
        A copy of applicable SCCs is available on request from{' '}
        <a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a>.
      </p>

      {/* 7 ─ Your rights */}
      <h2 style={S.h2}>7. Your Rights</h2>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Right</th>
            <th style={S.th}>Description</th>
            <th style={S.th}>How to exercise</th>
            <th style={S.th}>Law</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={S.td}>Access</td><td style={S.td}>Get a copy of all data we hold</td><td style={S.td}>In-app · <a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a></td><td style={S.td}>Art. 15 · DPDP §12</td></tr>
          <tr><td style={S.td}>Rectification</td><td style={S.td}>Correct inaccurate data</td><td style={S.td}>Edit profile in app</td><td style={S.td}>Art. 16 · KVKK md.11</td></tr>
          <tr><td style={S.td}>Erasure</td><td style={S.td}>&ldquo;Right to be forgotten&rdquo;</td><td style={S.td}>In-app · DPO email</td><td style={S.td}>Art. 17 · DPDP §13</td></tr>
          <tr><td style={S.td}>Restriction</td><td style={S.td}>Limit how we use your data</td><td style={S.td}><a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a></td><td style={S.td}>Art. 18</td></tr>
          <tr><td style={S.td}>Portability</td><td style={S.td}>Receive your data as a file</td><td style={S.td}>In-app (JSON-LD download)</td><td style={S.td}>Art. 20</td></tr>
          <tr><td style={S.td}>Object</td><td style={S.td}>Object to legitimate-interest processing</td><td style={S.td}><a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a></td><td style={S.td}>Art. 21 · KVKK md.11(e)</td></tr>
          <tr><td style={S.td}>Withdraw consent</td><td style={S.td}>Withdraw any consent at any time</td><td style={S.td}>Cookie settings or DPO email</td><td style={S.td}>Art. 7(3) · DPDP §6</td></tr>
        </tbody>
      </table>
      <p style={S.p}>
        <strong>Response time:</strong> 30 days. Complex requests may take up to 90 days
        — we will notify you in advance. Email <a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a>{' '}
        with subject &ldquo;Data Rights Request&rdquo; and your registered email address.
      </p>

      {/* 8 ─ Cookies */}
      <h2 style={S.h2}>8. Cookies</h2>
      <table style={S.table}>
        <thead>
          <tr><th style={S.th}>Category</th><th style={S.th}>Purpose</th><th style={S.th}>Consent required</th></tr>
        </thead>
        <tbody>
          <tr><td style={S.td}><strong>Strictly Necessary</strong></td><td style={S.td}>Session management, security, booking state</td><td style={S.td}>No (Art. 6(1)(b) — contract)</td></tr>
          <tr><td style={S.td}><strong>Analytics</strong></td><td style={S.td}>Usage tracking, funnel analysis</td><td style={S.td}>Yes — opt-in only</td></tr>
          <tr><td style={S.td}><strong>Marketing</strong></td><td style={S.td}>Personalised offers, retargeting</td><td style={S.td}>Yes — opt-in only</td></tr>
        </tbody>
      </table>
      <p style={S.p}>
        Manage your preferences via the cookie banner (shown to EU/UK/TR/IN users) or email{' '}
        <a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a>.
      </p>

      {/* 9 ─ Automated decision-making */}
      <h2 style={S.h2}>9. Automated Decision-Making (GDPR Art. 22)</h2>
      <p style={S.p}>
        Our AI Pricing Engine generates hotel price recommendations using aggregated occupancy
        and demand data. <strong>No personal data</strong> (name, email, nationality, booking
        history) enters the AI model. Pricing is set per hotel × date pair — the same price
        applies to all users for a given search.
      </p>
      <p style={S.p}>
        This does not constitute an automated decision with legal or similarly significant
        effect on individual users (EDPB Guidelines 05/2020 §16). You may request a human
        review of any price by contacting <a href="mailto:support@utubooking.com" style={S.link}>support@utubooking.com</a>.
      </p>

      {/* 10 ─ Data breach */}
      <h2 style={S.h2}>10. Data Breach Notification</h2>
      <p style={S.p}>
        In the event of a personal data breach, we will notify the relevant supervisory
        authority within <strong>72 hours</strong> (GDPR Art. 33 / DPDP §8) and inform
        affected users without undue delay if the breach poses a high risk to their rights.
      </p>

      {/* 11 ─ Complaint */}
      <h2 style={S.h2}>11. Right to Complain</h2>
      <p style={S.p}>
        We encourage you to contact us first at{' '}
        <a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a>.
        You also have the right to lodge a complaint with your national supervisory authority:
      </p>
      <table style={S.table}>
        <thead>
          <tr><th style={S.th}>Jurisdiction</th><th style={S.th}>Authority</th></tr>
        </thead>
        <tbody>
          <tr><td style={S.td}>UK</td><td style={S.td}>Information Commissioner&rsquo;s Office (ICO) — ico.org.uk</td></tr>
          <tr><td style={S.td}>EU (Ireland)</td><td style={S.td}>Data Protection Commission — dataprotection.ie</td></tr>
          <tr><td style={S.td}>France</td><td style={S.td}>CNIL — cnil.fr</td></tr>
          <tr><td style={S.td}>Germany</td><td style={S.td}>BfDI — bfdi.bund.de</td></tr>
          <tr><td style={S.td}>Turkey (KVKK)</td><td style={S.td}>Kişisel Verileri Koruma Kurumu — kvkk.gov.tr</td></tr>
          <tr><td style={S.td}>India (DPDP)</td><td style={S.td}>Data Protection Board of India — dpdp.gov.in</td></tr>
        </tbody>
      </table>

      {/* 12 ─ Changes */}
      <h2 style={S.h2}>12. Changes to This Policy</h2>
      <p style={S.p}>
        Material changes will be notified by email or in-app notice at least
        <strong> 30 days before</strong> they take effect. Previous versions are available
        from <a href="mailto:dpo@utubooking.com" style={S.link}>dpo@utubooking.com</a>.
      </p>

      {/* 13 ─ CCPA (California) */}
      <h2 id="ccpa" style={S.h2}>
        13. California Privacy Rights (CCPA / CPRA){' '}
        <span style={{ ...S.badge('#1D4ED8'), fontSize: 11, verticalAlign: 'middle' }}>CCPA</span>
      </h2>
      <p style={S.p}>
        This section applies to residents of California under the California Consumer Privacy
        Act (CCPA) 2018 and its amendment, the California Privacy Rights Act (CPRA) 2023.
      </p>
      <p style={{ ...S.p, fontSize: 13 }}>
        <strong>California Seller of Travel Registration:</strong>{' '}
        UTUBooking is registered as a California Seller of Travel.
        Registration No.{' '}
        <strong>{process.env.NEXT_PUBLIC_CA_CST_NUMBER ?? '2000000-40'}</strong>.{' '}
        Registration does not constitute approval by the State of California.
      </p>

      <h3 style={S.h3}>Your California Rights</h3>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Right</th>
            <th style={S.th}>Description</th>
            <th style={S.th}>How to exercise</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={S.td}><strong>Know</strong> (§1798.110)</td>
            <td style={S.td}>Request disclosure of data categories, sources, purposes, and third-party recipients</td>
            <td style={S.td}><code>GET /api/user/ccpa/rights</code> or email privacy@utubooking.com</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Delete</strong> (§1798.105)</td>
            <td style={S.td}>Request deletion of personal information (exemptions apply for tax/legal records)</td>
            <td style={S.td}><a href="/privacy/ccpa-opt-out" style={S.link}>Request deletion</a></td>
          </tr>
          <tr>
            <td style={S.td}><strong>Opt-out of sale / sharing</strong> (§1798.120)</td>
            <td style={S.td}>Direct UTUBooking not to sell or share your PI for cross-context behavioural advertising</td>
            <td style={S.td}><a href="/privacy/ccpa-opt-out" style={S.link}>Do Not Sell or Share</a></td>
          </tr>
          <tr>
            <td style={S.td}><strong>Correct</strong> (§1798.106)</td>
            <td style={S.td}>Request correction of inaccurate personal information</td>
            <td style={S.td}>Email privacy@utubooking.com or edit in account settings</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Limit sensitive PI</strong> (§1798.121)</td>
            <td style={S.td}>Limit use of sensitive personal information (nationality, precise geolocation)</td>
            <td style={S.td}>Email privacy@utubooking.com</td>
          </tr>
          <tr>
            <td style={S.td}><strong>Non-discrimination</strong> (§1798.125)</td>
            <td style={S.td}>Exercising rights will not result in denial of service, different pricing, or reduced quality</td>
            <td style={S.td}>Automatic — no action needed</td>
          </tr>
        </tbody>
      </table>

      <h3 style={S.h3}>Data We Collect (CCPA Categories)</h3>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Category</th>
            <th style={S.th}>Examples</th>
            <th style={S.th}>Sold / Shared?</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={S.td}>Identifiers</td><td style={S.td}>Name, email, phone, IP address</td><td style={S.td}>No</td></tr>
          <tr><td style={S.td}>Commercial information</td><td style={S.td}>Booking history, payment records</td><td style={S.td}>No</td></tr>
          <tr><td style={S.td}>Geolocation</td><td style={S.td}>Country/state derived from IP</td><td style={S.td}>No</td></tr>
          <tr><td style={S.td}>Internet activity</td><td style={S.td}>Browsing behaviour on utubooking.com</td><td style={S.td}>Analytics partners only (opt-in)</td></tr>
          <tr><td style={S.td}>Sensitive PI — nationality</td><td style={S.td}>Required for Hajj/Umrah visa compliance</td><td style={S.td}>No</td></tr>
        </tbody>
      </table>

      <h3 style={S.h3}>Submitting Requests</h3>
      <p style={S.p}>
        California residents (and authorised agents acting on their behalf) may submit requests:
      </p>
      <ul style={{ ...S.p, paddingLeft: 20 }}>
        <li>Online: <a href="/privacy/ccpa-opt-out" style={S.link}>utubooking.com/privacy/ccpa-opt-out</a></li>
        <li>Email: <a href="mailto:privacy@utubooking.com" style={S.link}>privacy@utubooking.com</a></li>
        <li>Phone: 1 (800) UTU-BOOK (toll-free, US only)</li>
      </ul>
      <p style={S.p}>
        We will respond within <strong>45 days</strong>. If additional time is needed, we will
        notify you within the initial 45-day period. No fee is charged unless requests are
        manifestly unfounded or excessive.
      </p>

      <hr style={S.divider} />

      <p style={{ ...S.p, fontSize: 13, color: '#9CA3AF' }}>
        UTUBooking Ltd · Registered address: [address] · Company number: [number]
        <br />
        <a href="mailto:dpo@utubooking.com" style={{ ...S.link, color: '#9CA3AF' }}>dpo@utubooking.com</a>
        {' · '}
        <a href="mailto:kvkk@utubooking.com" style={{ ...S.link, color: '#9CA3AF' }}>kvkk@utubooking.com</a>
        {' · '}
        <a href="mailto:privacy@utubooking.com" style={{ ...S.link, color: '#9CA3AF' }}>privacy@utubooking.com</a>
      </p>
    </main>
  );
}
