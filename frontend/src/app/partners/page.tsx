import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import CorporateEnquiryForm from './CorporateEnquiryForm';
export const metadata: Metadata = {
  title: 'Hotel & Business Partners — UTUBooking',
  description: 'List your hotel on UTUBooking or explore corporate travel solutions for businesses in the Gulf and Muslim World.',
};

export default async function PartnersPage() {
  const t = await getTranslations('partners');

  const hotelBenefits = [
    { icon: '🕌', title: t('hotel1Title'), desc: t('hotel1Desc') },
    { icon: '🌍', title: t('hotel2Title'), desc: t('hotel2Desc') },
    { icon: '💰', title: t('hotel3Title'), desc: t('hotel3Desc') },
    { icon: '📊', title: t('hotel4Title'), desc: t('hotel4Desc') },
  ];

  const bizBenefits = [
    { icon: '✈️', title: t('biz1Title'), desc: t('biz1Desc') },
    { icon: '📋', title: t('biz2Title'), desc: t('biz2Desc') },
    { icon: '👥', title: t('biz3Title'), desc: t('biz3Desc') },
    { icon: '🔒', title: t('biz4Title'), desc: t('biz4Desc') },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page">

      <section className="bg-utu-navy py-16 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto">{t('heroDesc')}</p>
      </section>

      {/* Tab nav */}
      <div className="bg-utu-bg-card border-b border-utu-border-default">
        <div className="max-w-5xl mx-auto px-4 flex">
          <a href="#hotels" className="px-5 py-4 text-sm font-semibold text-utu-blue border-b-2 border-utu-navy">
            {t('tabHotels')}
          </a>
          <a href="#business" className="px-5 py-4 text-sm font-medium text-utu-text-muted hover:text-utu-text-primary transition-colors">
            {t('tabBusiness')}
          </a>
          <a href="#advertise" className="px-5 py-4 text-sm font-medium text-utu-text-muted hover:text-utu-text-primary transition-colors">
            {t('tabAdvertise')}
          </a>
        </div>
      </div>

      {/* Hotel Partners */}
      <section id="hotels" className="py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary mb-2">{t('hotelsHeading')}</h2>
          <p className="text-utu-text-muted text-sm mb-8 max-w-xl">{t('hotelsDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {hotelBenefits.map((b) => (
              <div key={b.title} className="bg-utu-bg-card rounded-xl border border-utu-border-default shadow-sm p-5 flex gap-4">
                <span className="text-2xl shrink-0" aria-hidden="true">{b.icon}</span>
                <div>
                  <h3 className="font-semibold text-utu-text-primary mb-1">{b.title}</h3>
                  <p className="text-sm text-utu-text-muted">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/hotel-partners"
            className="inline-block bg-utu-navy hover:bg-utu-blue text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {t('listPropertyBtn')}
          </Link>
        </div>
      </section>

      {/* Business */}
      <section id="business" className="bg-utu-bg-card py-14 px-4 border-y border-utu-border-default">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary mb-2">{t('businessHeading')}</h2>
          <p className="text-utu-text-muted text-sm mb-8 max-w-xl">{t('businessDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {bizBenefits.map((b) => (
              <div key={b.title} className="bg-utu-bg-page rounded-xl border border-utu-border-default p-5 flex gap-4">
                <span className="text-2xl shrink-0" aria-hidden="true">{b.icon}</span>
                <div>
                  <h3 className="font-semibold text-utu-text-primary mb-1">{b.title}</h3>
                  <p className="text-sm text-utu-text-muted">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-6 p-4 rounded-xl border border-utu-border-default bg-utu-bg-page flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-utu-text-primary text-sm">Apply for UTUBooking for Business</p>
              <p className="text-xs text-utu-text-muted mt-0.5">Dedicated portal with policy controls, VAT invoicing, and group bookings.</p>
            </div>
            <Link
              href="/corporate/apply"
              className="shrink-0 inline-block bg-utu-navy hover:bg-utu-blue text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Apply Now
            </Link>
          </div>
          <CorporateEnquiryForm labels={{
            heading:      t('corpFormHeading'),
            desc:         t('corpFormDesc'),
            companyName:  t('corpFormCompanyName'),
            contactName:  t('corpFormContactName'),
            email:        t('corpFormEmail'),
            phone:        t('corpFormPhone'),
            travelers:    t('corpFormTravelers'),
            destinations: t('corpFormDestinations'),
            travelDates:  t('corpFormTravelDates'),
            message:      t('corpFormMessage'),
            submit:       t('corpFormSubmit'),
            submitting:   t('corpFormSubmitting'),
            success:      t('corpFormSuccess'),
            error:        t('corpFormError'),
          }} />
        </div>
      </section>

      {/* Advertise */}
      <section id="advertise" className="py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-utu-text-primary mb-3">{t('advertiseHeading')}</h2>
          <p className="text-utu-text-muted text-sm mb-6 max-w-lg mx-auto">{t('advertiseDesc')}</p>
          <Link
            href="/advertise/partner"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            {t('contactTeamBtn')}
          </Link>
        </div>
      </section>

    </div>
  );
}
