import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ContactForm from '@/components/contact/ContactForm';
import ContactSearch from '@/components/contact/ContactSearch';
import { SITE_CONFIG } from '@/lib/siteConfig';
export const metadata: Metadata = {
  title: 'Contact Us — UTUBooking.com',
  description: 'Get help with your UTUBooking hotel, flight, or car rental booking. 24/7 support in Arabic, English, and Urdu.',
};

export default async function ContactPage() {
  const t = await getTranslations('contact');

  const contactMethods = [
    {
      icon: '📧',
      title: t('emailTitle'),
      detail: t('emailDetail'),
      href: `mailto:${SITE_CONFIG.supportEmail}`,
      label: t('emailLabel'),
      note: t('emailNote'),
    },
    {
      icon: '💬',
      title: t('chatTitle'),
      detail: t('chatDetail'),
      href: '#contact',
      label: t('chatLabel'),
      note: t('chatNote'),
    },
    {
      icon: '📞',
      title: t('saudiTitle'),
      detail: t('saudiDetail'),
      href: `tel:${SITE_CONFIG.saudiPhone}`,
      label: t('saudiLabel'),
      note: t('saudiNote'),
    },
    {
      icon: '📞',
      title: t('uaeTitle'),
      detail: t('uaeDetail'),
      href: `tel:${SITE_CONFIG.uaePhone}`,
      label: t('uaeLabel'),
      note: t('uaeNote'),
    },
  ];

  const faqCategories = [
    {
      icon: '✈️',
      title: t('cat1Title'),
      topics: [t('cat1T1'), t('cat1T2'), t('cat1T3'), t('cat1T4'), t('cat1T5')],
    },
    {
      icon: '🏨',
      title: t('cat2Title'),
      topics: [t('cat2T1'), t('cat2T2'), t('cat2T3'), t('cat2T4'), t('cat2T5')],
    },
    {
      icon: '🕌',
      title: t('cat3Title'),
      topics: [t('cat3T1'), t('cat3T2'), t('cat3T3'), t('cat3T4'), t('cat3T5')],
    },
    {
      icon: '🚗',
      title: t('cat4Title'),
      topics: [t('cat4T1'), t('cat4T2'), t('cat4T3'), t('cat4T4'), t('cat4T5')],
    },
    {
      icon: '💳',
      title: t('cat5Title'),
      topics: [t('cat5T1'), t('cat5T2'), t('cat5T3'), t('cat5T4'), t('cat5T5')],
    },
    {
      icon: '🔧',
      title: t('cat6Title'),
      topics: [t('cat6T1'), t('cat6T2'), t('cat6T3'), t('cat6T4'), t('cat6T5')],
    },
    {
      icon: '📋',
      title: t('cat7Title'),
      topics: [t('cat7T1'), t('cat7T2'), t('cat7T3'), t('cat7T4'), t('cat7T5')],
    },
    {
      icon: '🛡️',
      title: t('cat8Title'),
      topics: [t('cat8T1'), t('cat8T2'), t('cat8T3'), t('cat8T4'), t('cat8T5')],
    },
  ];

  const selfService = [
    { icon: '🔍', label: t('selfTrackRefund'),    href: '/login' },
    { icon: '✈️', label: t('selfManageBookings'), href: '/login' },
    { icon: '📡', label: t('selfFlightStatus'),   href: '/faq' },
    { icon: '🗓️', label: t('selfChangeCancel'),   href: '/login' },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page font-sans">

      {/* Hero */}
      <section className="bg-gradient-to-b from-utu-navy to-utu-blue py-14 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-3">{t('heroHeading')}</h1>
          <p className="text-white/80 text-base">{t('heroDesc')}</p>
          <div className="mt-6 max-w-lg mx-auto">
            <ContactSearch placeholder={t('searchPlaceholder')} btnLabel={t('searchBtn')} />
          </div>
        </div>
      </section>

      {/* Self-Service Quick Links */}
      <section className="bg-utu-bg-card border-b border-utu-border-default py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selfService.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="flex items-center gap-2 bg-utu-bg-page hover:bg-utu-bg-subtle border border-utu-border-default hover:border-utu-border-default rounded-xl px-4 py-3 text-sm font-medium text-utu-text-secondary hover:text-utu-blue transition-colors"
              >
                <span className="text-lg" aria-hidden="true">{s.icon}</span>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('contactTeamHeading')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactMethods.map((m) => (
              <div key={m.title} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 flex flex-col items-center text-center gap-3">
                <span className="text-3xl" aria-hidden="true">{m.icon}</span>
                <div>
                  <div className="font-semibold text-utu-text-primary text-sm">{m.title}</div>
                  <div className="text-utu-text-muted text-xs mt-0.5">{m.detail}</div>
                </div>
                <a
                  href={m.href}
                  className="mt-auto w-full bg-utu-navy hover:bg-utu-blue text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors text-center"
                >
                  {m.label}
                </a>
                <span className="text-xs text-utu-text-muted">{m.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="bg-utu-bg-card py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-2">{t('faqHeading')}</h2>
          <p className="text-center text-utu-text-muted text-sm mb-8">{t('faqDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {faqCategories.map((cat) => (
              <div key={cat.title} className="bg-utu-bg-page rounded-2xl border border-utu-border-default p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                  <h3 className="font-semibold text-utu-text-primary text-sm">{cat.title}</h3>
                </div>
                <ul className="space-y-1.5">
                  {cat.topics.map((topic) => (
                    <li key={topic}>
                      <a href="/faq" className="text-xs text-utu-text-muted hover:text-utu-blue hover:underline transition-colors leading-snug block">
                        {topic}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-14 px-4">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-2">{t('formHeading')}</h2>
          <p className="text-center text-utu-text-muted text-sm mb-8">{t('formDesc')}</p>
          <ContactForm labels={{
            fieldName: t('fieldName'), fieldNamePh: t('fieldNamePh'),
            fieldEmail: t('fieldEmail'), fieldEmailPh: t('fieldEmailPh'),
            fieldRef: t('fieldRef'), fieldRefPh: t('fieldRefPh'),
            fieldTopic: t('fieldTopic'), fieldTopicDefault: t('fieldTopicDefault'),
            topics: [
              { value: 'flights',  label: t('topicFlights') },
              { value: 'hotels',   label: t('topicHotels') },
              { value: 'hajj',     label: t('topicHajj') },
              { value: 'cars',     label: t('topicCars') },
              { value: 'payments', label: t('topicPayments') },
              { value: 'tech',     label: t('topicTech') },
              { value: 'visa',     label: t('topicVisa') },
              { value: 'privacy',  label: t('topicPrivacy') },
              { value: 'other',    label: t('topicOther') },
            ],
            fieldMessage: t('fieldMessage'), fieldMessagePh: t('fieldMessagePh'),
            submitBtn: t('submitBtn'),
            sendingLabel: t('sendingLabel'),
            successTitle: t('successTitle'),
            successDesc: t('successDesc'),
            errorGeneric: t('errorGeneric'),
            errorNetwork: t('errorNetwork'),
          }} />
        </div>
      </section>

    </div>
  );
}
