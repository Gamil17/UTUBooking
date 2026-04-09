import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — UTUBooking.com',
  description: 'UTUBooking.com Terms of Service. Read the terms governing your use of our hotel, flight, and car rental booking platform.',
};

const sections = [
  {
    id: 'about',
    heading: 'About UTUBooking',
    content: (
      <>
        <p>UTUBooking.com is operated by AMEC Solutions, a travel technology company serving Gulf, Middle East, and Muslim World markets. Our platform provides hotel, flight, and car rental booking services with a focus on Hajj and Umrah travelers.</p>
        <p className="mt-3">By accessing or using UTUBooking.com or our mobile applications, you agree to these Terms of Service in full. If you do not agree, do not use our services.</p>
      </>
    ),
  },
  {
    id: '1',
    heading: '1. Limitations on Use',
    content: (
      <>
        <p>You may use UTUBooking services exclusively for personal, non-commercial, and lawful purposes. The following are strictly prohibited:</p>
        <ul className="mt-3 space-y-1 list-disc list-inside text-utu-text-secondary">
          <li>Speculative, false, or fraudulent reservations</li>
          <li>Automated queries or scraping of our platform</li>
          <li>Interfering with the proper functioning of the platform</li>
          <li>Using another person&apos;s payment credentials without authorization</li>
          <li>Reselling or commercially exploiting booking data</li>
        </ul>
      </>
    ),
  },
  {
    id: '2',
    heading: '2. Changes to These Terms',
    content: <p>AMEC Solutions reserves the right to modify these Terms at any time without prior notice. Continued use of UTUBooking following any changes constitutes your acceptance of the updated Terms. Material changes will be communicated via email or platform notification where practicable.</p>,
  },
  {
    id: '3',
    heading: '3. Privacy',
    content: <p>Your use of UTUBooking is also governed by our <Link href="/privacy" className="text-emerald-700 hover:underline">Data Privacy Policy</Link>. By using our services, you consent to the data practices described in that policy.</p>,
  },
  {
    id: '4',
    heading: '4. User Account',
    content: (
      <>
        <p>When creating a UTUBooking account, you represent that all information provided is true, accurate, current, and complete. You are responsible for:</p>
        <ul className="mt-3 space-y-1 list-disc list-inside text-utu-text-secondary">
          <li>Maintaining the confidentiality of your password</li>
          <li>All activity that occurs under your account</li>
          <li>Notifying us immediately of any unauthorized access at <a href="mailto:privacy@utubooking.com" className="text-emerald-700 hover:underline">privacy@utubooking.com</a></li>
        </ul>
        <p className="mt-3">AMEC Solutions disclaims liability for damages resulting from failure to maintain account security.</p>
      </>
    ),
  },
  {
    id: '5',
    heading: '5. Disclaimer of Warranty',
    content: <p className="uppercase text-sm tracking-wide">The services are provided by AMEC Solutions &quot;as is&quot; and you use them at your sole risk. To the fullest extent permitted by law, AMEC Solutions disclaims all warranties, express or implied, including warranties of security, reliability, accuracy, timeliness, and fitness for a particular purpose.</p>,
  },
  {
    id: '6',
    heading: '6. Limitation of Liability',
    content: <p>AMEC Solutions shall not be liable for indirect, incidental, consequential, or punitive damages arising from your use of UTUBooking. Our total liability to you for any claim shall not exceed the amount you paid for the relevant booking transaction. This limitation applies to service interruptions and third-party content accessed through our platform.</p>,
  },
  {
    id: '7',
    heading: '7. Indemnification',
    content: <p>You agree to defend, indemnify, and hold harmless AMEC Solutions, its subsidiaries, affiliates, officers, and employees against any claims, liabilities, damages, or expenses (including legal fees) arising from your breach of these Terms, violation of any law, or misuse of our services.</p>,
  },
  {
    id: '8',
    heading: '8. Intellectual Property',
    content: <p>UTUBooking.com, the UTUBooking logo, and all associated brand assets are trademarks of AMEC Solutions. Unauthorized use may violate copyright, trademark, or intellectual property laws. Third-party brand names appearing on our platform remain the property of their respective owners.</p>,
  },
  {
    id: '9',
    heading: '9. Third-Party Travel Suppliers',
    content: (
      <ul className="space-y-2 text-utu-text-secondary">
        <li><strong className="text-utu-text-primary">9.1</strong> Hotels, airlines, and car rental companies listed on UTUBooking are independent contractors and are not agents or employees of AMEC Solutions.</li>
        <li><strong className="text-utu-text-primary">9.2</strong> Display of travel options on UTUBooking does not imply sponsorship or approval by AMEC Solutions.</li>
        <li><strong className="text-utu-text-primary">9.3</strong> AMEC Solutions bears no responsibility for the accuracy, timeliness, or completeness of information provided by travel suppliers.</li>
        <li><strong className="text-utu-text-primary">9.4</strong> You transact directly with third-party suppliers at your own risk.</li>
        <li><strong className="text-utu-text-primary">9.5</strong> External websites linked from UTUBooking are controlled by other parties. AMEC Solutions does not control or endorse their content.</li>
      </ul>
    ),
  },
  {
    id: '10',
    heading: '10. Payment',
    content: (
      <div className="space-y-4">
        <div><h3 className="font-semibold text-utu-text-primary mb-1">10.1 Payment Credentials</h3><p>Payment information must be accurate and for cards you are legally authorized to use.</p></div>
        <div><h3 className="font-semibold text-utu-text-primary mb-1">10.2 Payment Fees</h3><p>Some payment methods may incur processing surcharges, displayed before you complete your booking. Non-refundable processing fees are shown at checkout.</p></div>
        <div><h3 className="font-semibold text-utu-text-primary mb-1">10.3 Currency and Foreign Exchange</h3><p>Prices are displayed in your selected currency (SAR is the default for Saudi Arabia). AMEC Solutions accepts no liability for bank surcharges, FX rate differences, or conversion-related costs.</p></div>
        <div><h3 className="font-semibold text-utu-text-primary mb-1">10.4 Refunds</h3><p>Refunds are returned to the original payment method within 15-20 working days (up to 30 days for Mada and local bank transfers).</p></div>
        <div><h3 className="font-semibold text-utu-text-primary mb-1">10.5 STC Pay (Saudi Arabia)</h3><p>Available to Saudi Arabian residents aged 18+. STC Pay&apos;s own terms govern transaction limits. AMEC Solutions bears no responsibility for STC Pay delays or failures.</p></div>
        <div>
          <h3 className="font-semibold text-utu-text-primary mb-2">10.6 Payment Methods by Region</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-emerald-50"><th className="text-left p-2 border border-utu-border-default font-semibold text-utu-text-secondary">Region</th><th className="text-left p-2 border border-utu-border-default font-semibold text-utu-text-secondary">Payment Methods</th></tr></thead>
              <tbody className="text-utu-text-secondary">
                {[
                  ['Saudi Arabia / Gulf', 'STC Pay, Mada, Stripe'],
                  ['United States', 'Stripe, PayPal, Affirm (BNPL)'],
                  ['Europe / UK', 'Stripe Payment Element'],
                  ['Switzerland', 'TWINT, Stripe'],
                  ['Brazil / LatAm', 'PIX, Boleto, MercadoPago'],
                  ['Canada', 'Interac e-Transfer, Stripe'],
                  ['Turkey', 'iyzico'],
                  ['Malaysia', 'iPay88 (FPX, DuitNow, TNG, GrabPay)'],
                  ['India', 'Razorpay (UPI, card, EMI)'],
                  ['Indonesia', 'Midtrans Snap'],
                  ['Pakistan', 'JazzCash, Easypaisa'],
                ].map(([region, methods]) => (
                  <tr key={region} className="even:bg-utu-bg-muted">
                    <td className="p-2 border border-utu-border-default">{region}</td>
                    <td className="p-2 border border-utu-border-default">{methods}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: '11',
    heading: '11. Fraud Management',
    content: <p>Bookings or accounts showing signs of fraud or suspicious activity may be cancelled without notice. AMEC Solutions reserves the right to pursue criminal and civil action. To contest a cancellation, contact <a href="mailto:support@utubooking.com" className="text-emerald-700 hover:underline">support@utubooking.com</a>.</p>,
  },
  {
    id: '12',
    heading: '12. Travel Vouchers',
    content: (
      <ul className="space-y-2 text-utu-text-secondary">
        <li><strong className="text-utu-text-primary">12.1 Issuance:</strong> Vouchers may be issued upon cancellation in lieu of a monetary refund, in the original booking currency.</li>
        <li><strong className="text-utu-text-primary">12.2 Eligible Use:</strong> Redeemable on UTUBooking.com and our mobile apps for hotel and flight bookings only.</li>
        <li><strong className="text-utu-text-primary">12.3 Validity:</strong> Valid for 12 months from issuance. Expired vouchers have no value and cannot be reinstated.</li>
        <li><strong className="text-utu-text-primary">12.4 Non-Transferability:</strong> Non-transferable; sole use by the issued account holder.</li>
        <li><strong className="text-utu-text-primary">12.5 No Cash Value:</strong> Vouchers cannot be exchanged or refunded for cash.</li>
      </ul>
    ),
  },
  {
    id: '13',
    heading: '13. Hajj and Umrah Bookings',
    content: <p>UTUBooking provides specialized services for Hajj and Umrah travelers, including national quota management, Tabung Haji integration (Malaysia), and Hajj Committee coordination (India). These bookings are subject to the applicable regulations of your country&apos;s Ministry of Hajj. Cancellation and refund policies may differ from standard hotel or flight policies.</p>,
  },
  {
    id: '14',
    heading: '14. Supplier Terms',
    content: (
      <>
        <p>Bookings are also subject to the terms of the relevant travel supplier, including:</p>
        <ul className="mt-3 space-y-1 list-disc list-inside text-utu-text-secondary">
          <li>Hotelbeds: hotelbeds.com</li>
          <li>Booking.com: booking.com/content/terms.en-gb.html</li>
          <li>Amadeus GDS: amadeus.com</li>
          <li>Individual hotel, airline, and car rental company policies displayed at booking</li>
        </ul>
      </>
    ),
  },
  {
    id: '15',
    heading: '15. Miscellaneous',
    content: (
      <ul className="space-y-1 list-disc list-inside text-utu-text-secondary">
        <li>You may not assign or transfer your rights or obligations under these Terms.</li>
        <li>Our failure to enforce any provision does not waive our rights.</li>
        <li>If any provision is found invalid, it will be replaced with a valid alternative matching the original intent.</li>
        <li>These Terms and the Privacy Policy constitute the entire agreement between you and AMEC Solutions.</li>
      </ul>
    ),
  },
  {
    id: '16',
    heading: '16. Governing Law',
    content: <p>These Terms are governed by the laws of the Kingdom of Saudi Arabia for users in KSA, and by the laws of the United Arab Emirates for all other users. Disputes are subject to the exclusive jurisdiction of the relevant courts in those jurisdictions.</p>,
  },
  {
    id: '17',
    heading: '17. Contact',
    content: (
      <div className="space-y-1 text-utu-text-secondary">
        <p><strong className="text-utu-text-primary">AMEC Solutions — UTUBooking.com</strong></p>
        <p>General: <a href="mailto:support@utubooking.com" className="text-emerald-700 hover:underline">support@utubooking.com</a></p>
        <p>Legal: <a href="mailto:legal@utubooking.com" className="text-emerald-700 hover:underline">legal@utubooking.com</a></p>
        <p>Privacy: <a href="mailto:privacy@utubooking.com" className="text-emerald-700 hover:underline">privacy@utubooking.com</a></p>
      </div>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Navbar */}
      <header className="bg-emerald-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
              <span className="text-emerald-900 font-black text-xs">U</span>
            </div>
            <span className="font-bold text-base tracking-tight">UTUBooking</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-emerald-100">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/#contact" className="hover:text-white transition-colors">Contact Us</Link>
          </nav>
          <Link href="/" className="bg-utu-bg-card/10 hover:bg-utu-bg-card/20 border border-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            Book Now
          </Link>
        </div>
      </header>

      {/* Header */}
      <section className="bg-emerald-800 py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-emerald-200 text-sm">Last updated: March 2026 — AMEC Solutions</p>
          <p className="mt-3 text-amber-300 text-xs font-semibold uppercase tracking-widest">
            Draft — Pending legal review before publication
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* TOC */}
        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6 mb-10">
          <h2 className="font-semibold text-utu-text-primary mb-3 text-sm uppercase tracking-wide">Contents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-sm text-emerald-700 hover:underline py-0.5">
                {s.heading}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6">
              <h2 className="text-lg font-bold text-utu-text-primary mb-4">{s.heading}</h2>
              <div className="text-utu-text-secondary leading-relaxed text-sm">{s.content}</div>
            </section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-utu-text-muted py-8 px-4 text-center text-sm /* EXCEPTION: dark mini-footer */">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© 2026 UTUBooking.com — AMEC Solutions. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/#contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/terms" className="text-white font-semibold">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
