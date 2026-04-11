import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SITE_CONFIG } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Careers — UTUBooking | AMEC Solutions',
  description: 'Join the team building the best travel platform for Muslim travelers. Explore open roles at UTUBooking.com.',
};

interface ApiJob {
  id:          string;
  title:       string;
  team:        string;
  location:    string;
  type:        string;
  description: string | null;
}

async function fetchJobs(): Promise<ApiJob[]> {
  try {
    const res = await fetch(
      `${process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001'}/api/jobs`,
      { cache: 'no-store', signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function CareersPage() {
  const t = await getTranslations('careers');

  const i18nOpenings = [
    { title: t('job1Title'), team: t('job1Team'), location: t('job1Location'), type: t('job1Type') },
    { title: t('job2Title'), team: t('job2Team'), location: t('job2Location'), type: t('job2Type') },
    { title: t('job3Title'), team: t('job3Team'), location: t('job3Location'), type: t('job3Type') },
    { title: t('job4Title'), team: t('job4Team'), location: t('job4Location'), type: t('job4Type') },
    { title: t('job5Title'), team: t('job5Team'), location: t('job5Location'), type: t('job5Type') },
  ];

  const apiJobs   = await fetchJobs();
  const openings  = apiJobs.length > 0 ? apiJobs : i18nOpenings;

  const perks = [
    { icon: '🌍', title: t('perk1Title'), desc: t('perk1Desc') },
    { icon: '🕌', title: t('perk2Title'), desc: t('perk2Desc') },
    { icon: '📈', title: t('perk3Title'), desc: t('perk3Desc') },
    { icon: '🏥', title: t('perk4Title'), desc: t('perk4Desc') },
    { icon: '📅', title: t('perk5Title'), desc: t('perk5Desc') },
    { icon: '🎓', title: t('perk6Title'), desc: t('perk6Desc') },
  ];

  return (
    <div className="min-h-screen bg-utu-bg-page">

      <section className="bg-utu-navy py-16 px-4 text-center">
        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">{t('tagline')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('heroHeading')}</h1>
        <p className="text-white/80 max-w-xl mx-auto">{t('heroDesc')}</p>
      </section>

      {/* Perks */}
      <section className="bg-utu-bg-card py-14 px-4 border-b border-utu-border-default">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary text-center mb-8">{t('perksHeading')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {perks.map((p) => (
              <div key={p.title} className="bg-utu-bg-page rounded-xl p-5 border border-utu-border-default">
                <span className="text-2xl" aria-hidden="true">{p.icon}</span>
                <h3 className="font-semibold text-utu-text-primary mt-2 mb-1">{p.title}</h3>
                <p className="text-sm text-utu-text-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-utu-text-primary mb-6">{t('openingsHeading')}</h2>
          <div className="space-y-3">
            {openings.map((role) => (
              <div
                key={role.title}
                className="bg-utu-bg-card rounded-xl border border-utu-border-default shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h3 className="font-semibold text-utu-text-primary">{role.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="text-xs bg-utu-bg-subtle text-utu-blue px-2.5 py-0.5 rounded-full">{role.team}</span>
                    <span className="text-xs text-utu-text-muted">{role.location}</span>
                    <span className="text-xs text-utu-text-muted">{role.type}</span>
                  </div>
                </div>
                <Link
                  href={`/careers/apply?role=${encodeURIComponent(role.title)}${'id' in role ? `&jobId=${(role as ApiJob).id}` : ''}`}
                  className="shrink-0 bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {t('applyBtn')}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-sm text-utu-text-muted mt-6 text-center">
            {t('noFitText')}{' '}
            <a href={`mailto:${SITE_CONFIG.careersEmail}`} className="text-utu-blue underline">
              {SITE_CONFIG.careersEmail}
            </a>
          </p>
        </div>
      </section>

    </div>
  );
}
