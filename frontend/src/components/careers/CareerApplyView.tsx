'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { JobDescription } from '@/lib/careers/jobDescriptions';
import CareerApplicationForm from './CareerApplicationForm';

interface Props {
  job: JobDescription;
}

export default function CareerApplyView({ job }: Props) {
  const t = useTranslations('careers');
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function handleApplyClick() {
    setShowForm(true);
    // Small delay so the form renders before we scroll to it
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  return (
    <div className="space-y-6">

      {/* Job Description Card */}
      <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-utu-navy px-6 py-5">
          <h2 className="text-xl font-bold text-white">{job.title}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{job.team}</span>
            <span className="text-xs text-white/80">{job.location}</span>
            <span className="text-xs text-white/80">{job.type}</span>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* About the role */}
          <div>
            <h3 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-2">
              {t('jobAbout')}
            </h3>
            <p className="text-sm text-utu-text-secondary leading-relaxed">{job.about}</p>
          </div>

          {/* Responsibilities */}
          <div>
            <h3 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-3">
              {t('jobResponsibilities')}
            </h3>
            <ul className="space-y-2">
              {job.responsibilities.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-utu-text-secondary">
                  <span className="text-utu-blue mt-0.5 flex-shrink-0" aria-hidden="true">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-3">
              {t('jobRequirements')}
            </h3>
            <ul className="space-y-2">
              {job.requirements.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-utu-text-secondary">
                  <span className="text-utu-blue mt-0.5 flex-shrink-0" aria-hidden="true">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Nice to Have */}
          {job.niceToHave.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-3">
                {t('jobNiceToHave')}
              </h3>
              <ul className="space-y-2">
                {job.niceToHave.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-utu-text-muted">
                    <span className="mt-0.5 flex-shrink-0" aria-hidden="true">◦</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Apply button at bottom of description */}
        {!showForm && (
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={handleApplyClick}
              className="w-full bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold py-3 rounded-xl transition-colors min-h-[44px]"
            >
              {t('applyBtn2')}
            </button>
          </div>
        )}
      </div>

      {/* Application Form — revealed on Apply click */}
      {showForm && (
        <div ref={formRef}>
          <h2 className="text-lg font-bold text-utu-text-primary mb-4">{t('yourApplication')}</h2>
          <CareerApplicationForm role={job.title} />
        </div>
      )}

    </div>
  );
}
