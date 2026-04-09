'use client';

/**
 * MehramVerificationStep
 *
 * Step 2 of the booking flow for Hajj/Umrah bookings from Pakistan (PK)
 * and India (IN). Collects and validates Mahram companion information per
 * Saudi Ministry of Hajj regulations.
 *
 * Rules:
 *   Male traveler          → passes through automatically
 *   Female + age ≥ 45      → passes through (Saudi exemption)
 *   Female + age < 45      → must select: with Mahram OR authorized group
 *   Female + age < 45 + no option → booking blocked
 *
 * Locales:
 *   ur (Urdu)  → RTL, Noto Nastaliq Urdu font
 *   hi (Hindi) → LTR, Noto Sans Devanagari font
 *   others     → LTR, Inter font
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

// ── Types ──────────────────────────────────────────────────────────────────────
type Gender       = 'male' | 'female';
type MehramOption = 'with_mahram' | 'authorized_group';

export interface MehramFormData {
  gender:                 Gender;
  age?:                   number;
  option?:                MehramOption;
  companionName?:         string;
  companionRelationship?: string;
  groupOperator?:         string;
}

interface Props {
  bookingId:    string;
  bookingType:  'hajj' | 'umrah';
  userCountry:  string;          // ISO 3166-1 alpha-2
  onComplete:   (data: MehramFormData) => void;
  onBack:       () => void;
}

const MAHRAM_RELATIONSHIPS = [
  'husband',
  'father',
  'brother',
  'son',
  'uncle',
  'grandfather',
] as const;

const MEHRAM_AGE_THRESHOLD = 45;

// ── Component ──────────────────────────────────────────────────────────────────
export default function MehramVerificationStep({
  onComplete,
  onBack,
}: Props) {
  const t      = useTranslations('mehram');
  const locale = useLocale();

  const isRtl  = locale === 'ur' || locale === 'fa' || locale === 'ar';
  const font   =
    locale === 'ur' ? "'Noto Nastaliq Urdu', serif"    :
    locale === 'hi' ? "'Noto Sans Devanagari', sans-serif" :
    'Inter, sans-serif';

  const [gender,       setGender]       = useState<Gender | ''>('');
  const [age,          setAge]          = useState('');
  const [option,       setOption]       = useState<MehramOption | ''>('');
  const [companionName,      setCompanionName]      = useState('');
  const [companionRel,       setCompanionRel]       = useState('');
  const [groupOperator,      setGroupOperator]      = useState('');
  const [error,        setError]        = useState('');
  const [submitted,    setSubmitted]    = useState(false);

  // Derived state
  const ageNum         = parseInt(age, 10);
  const isFemale       = gender === 'female';
  const isUnder45      = isFemale && Number.isFinite(ageNum) && ageNum < MEHRAM_AGE_THRESHOLD;
  const isExemptByAge  = isFemale && Number.isFinite(ageNum) && ageNum >= MEHRAM_AGE_THRESHOLD;

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    if (!gender) {
      setError(t('genderLabel'));
      return false;
    }
    if (gender === 'male') return true;

    if (!age || !Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
      setError(t('ageLabel'));
      return false;
    }
    if (ageNum >= MEHRAM_AGE_THRESHOLD) return true;

    // Female under 45
    if (!option) {
      setError(t('blockedMessage'));
      return false;
    }
    if (option === 'with_mahram') {
      if (!companionName.trim()) { setError(t('companionNameLabel')); return false; }
      if (!companionRel)         { setError(t('relationshipLabel'));   return false; }
    }
    if (option === 'authorized_group') {
      if (!groupOperator.trim()) { setError(t('groupOperatorLabel')); return false; }
    }
    return true;
  }

  function handleContinue() {
    setSubmitted(true);
    setError('');
    if (!validate()) return;

    onComplete({
      gender:                gender as Gender,
      age:                   Number.isFinite(ageNum) ? ageNum : undefined,
      option:                option || undefined,
      companionName:         companionName.trim() || undefined,
      companionRelationship: companionRel || undefined,
      groupOperator:         groupOperator.trim() || undefined,
    });
  }

  // ── Shared input classes ──────────────────────────────────────────────────
  const inputCls =
    'w-full border border-utu-border-strong rounded-xl px-4 py-3 text-base text-utu-text-primary ' +
    'focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent ' +
    'placeholder-gray-400 min-h-[44px]';

  const cardCls = (active: boolean) =>
    [
      'w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-start cursor-pointer',
      active
        ? 'border-utu-blue bg-utu-bg-subtle shadow-sm'
        : 'border-utu-border-default bg-utu-bg-card hover:border-utu-border-strong',
    ].join(' ');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full max-w-lg mx-auto space-y-6"
      style={{ fontFamily: font }}
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-utu-text-primary" style={{ lineHeight: 1.6 }}>
          {t('stepTitle')}
        </h2>
        <p className="text-sm text-utu-text-muted mt-2 leading-relaxed">
          {t('subtitle')}
        </p>
      </div>

      {/* Gender selector */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-utu-text-secondary" style={{ lineHeight: 1.8 }}>
          {t('genderLabel')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['male', 'female'] as Gender[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => { setGender(g); setError(''); setOption(''); }}
              aria-pressed={gender === g}
              className={cardCls(gender === g)}
              style={{ lineHeight: 1.8 }}
            >
              <span className="text-xl">{g === 'male' ? '👤' : '👤'}</span>
              <span className="font-medium text-utu-text-primary">
                {t(g === 'male' ? 'genderMale' : 'genderFemale')}
              </span>
              <div className={[
                'ms-auto w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                gender === g ? 'border-utu-blue bg-utu-bg-subtle0' : 'border-utu-border-strong',
              ].join(' ')}>
                {gender === g && <div className="w-2 h-2 rounded-full bg-utu-bg-card" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Age input — only for female */}
      {isFemale && (
        <div className="space-y-1.5">
          <label htmlFor="mehram-age" className="block text-sm font-semibold text-utu-text-secondary" style={{ lineHeight: 1.8 }}>
            {t('ageLabel')}
          </label>
          <input
            id="mehram-age"
            type="number"
            min={1}
            max={120}
            dir="ltr"
            inputMode="numeric"
            placeholder={t('agePlaceholder')}
            value={age}
            onChange={e => { setAge(e.target.value); setError(''); }}
            className={inputCls}
            style={{ fontFamily: 'Inter, sans-serif', textAlign: isRtl ? 'right' : 'left' }}
          />
        </div>
      )}

      {/* Male / age-exempt — show info banner */}
      {gender === 'male' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
          <p className="text-sm text-blue-700" style={{ lineHeight: 1.8 }}>
            {t('maleExemptMessage')}
          </p>
        </div>
      )}

      {isExemptByAge && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <p className="text-sm text-amber-800" style={{ lineHeight: 1.8 }}>
            {t('exemptMessage')}
          </p>
        </div>
      )}

      {/* Travel arrangement — only for female under 45 */}
      {isUnder45 && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-utu-text-secondary" style={{ lineHeight: 1.8 }}>
            {t('optionTitle')}
          </label>

          {/* Option: with Mahram */}
          <button
            type="button"
            onClick={() => { setOption('with_mahram'); setError(''); }}
            aria-pressed={option === 'with_mahram'}
            className={cardCls(option === 'with_mahram')}
          >
            <div className="flex-1 text-start">
              <p className="font-medium text-utu-text-primary text-sm" style={{ lineHeight: 1.8 }}>
                {t('optionWithMahram')}
              </p>
            </div>
            <div className={[
              'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5',
              option === 'with_mahram' ? 'border-utu-blue bg-utu-bg-subtle0' : 'border-utu-border-strong',
            ].join(' ')}>
              {option === 'with_mahram' && <div className="w-2 h-2 rounded-full bg-utu-bg-card" />}
            </div>
          </button>

          {/* Mahram details */}
          {option === 'with_mahram' && (
            <div className="ms-2 ps-4 border-s-2 border-utu-border-default space-y-4">
              {/* Companion name */}
              <div className="space-y-1.5">
                <label htmlFor="companion-name" className="block text-sm font-medium text-utu-text-secondary" style={{ lineHeight: 1.8 }}>
                  {t('companionNameLabel')}
                </label>
                <input
                  id="companion-name"
                  type="text"
                  placeholder={t('companionNamePlaceholder')}
                  value={companionName}
                  onChange={e => { setCompanionName(e.target.value); setError(''); }}
                  className={inputCls}
                  autoComplete="name"
                />
              </div>

              {/* Relationship */}
              <div className="space-y-1.5">
                <label htmlFor="companion-rel" className="block text-sm font-medium text-utu-text-secondary" style={{ lineHeight: 1.8 }}>
                  {t('relationshipLabel')}
                </label>
                <select
                  id="companion-rel"
                  value={companionRel}
                  onChange={e => { setCompanionRel(e.target.value); setError(''); }}
                  className={`${inputCls} bg-utu-bg-card`}
                >
                  <option value="">—</option>
                  {MAHRAM_RELATIONSHIPS.map(rel => (
                    <option key={rel} value={rel}>
                      {t(`relationships.${rel}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Option: authorized group */}
          <button
            type="button"
            onClick={() => { setOption('authorized_group'); setError(''); }}
            aria-pressed={option === 'authorized_group'}
            className={cardCls(option === 'authorized_group')}
          >
            <div className="flex-1 text-start">
              <p className="font-medium text-utu-text-primary text-sm" style={{ lineHeight: 1.8 }}>
                {t('optionGroup')}
              </p>
            </div>
            <div className={[
              'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5',
              option === 'authorized_group' ? 'border-utu-blue bg-utu-bg-subtle0' : 'border-utu-border-strong',
            ].join(' ')}>
              {option === 'authorized_group' && <div className="w-2 h-2 rounded-full bg-utu-bg-card" />}
            </div>
          </button>

          {/* Group operator */}
          {option === 'authorized_group' && (
            <div className="ms-2 ps-4 border-s-2 border-utu-border-default space-y-1.5">
              <label htmlFor="group-operator" className="block text-sm font-medium text-utu-text-secondary" style={{ lineHeight: 1.8 }}>
                {t('groupOperatorLabel')}
              </label>
              <input
                id="group-operator"
                type="text"
                placeholder={t('groupOperatorPlaceholder')}
                value={groupOperator}
                onChange={e => { setGroupOperator(e.target.value); setError(''); }}
                className={inputCls}
              />
            </div>
          )}

          {/* Blocked banner — shown when submitted without valid option */}
          {submitted && !option && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-red-700 font-medium" style={{ lineHeight: 1.8 }}>
                {t('blockedMessage')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generic error */}
      {error && isUnder45 && option && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3" style={{ lineHeight: 1.8 }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-utu-border-strong text-utu-text-secondary rounded-xl py-3 text-sm font-medium hover:bg-utu-bg-muted transition-colors min-h-[44px]"
          style={{ lineHeight: 1.8 }}
        >
          {t('backBtn')}
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!gender}
          className={[
            'flex-grow rounded-xl py-3 text-sm font-semibold transition-colors min-h-[44px]',
            !gender
              ? 'bg-utu-border-default text-utu-text-muted cursor-not-allowed'
              : 'bg-utu-blue hover:bg-utu-navy active:bg-utu-navy text-white',
          ].join(' ')}
          style={{ lineHeight: 1.8 }}
        >
          {t('continueBtn')}
        </button>
      </div>
    </div>
  );
}
