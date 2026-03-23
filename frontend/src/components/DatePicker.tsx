'use client';

/**
 * LocaleDatePicker — replaces native <input type="date">.
 *
 * Why: Native date pickers use the OS calendar popup which ignores the
 * document's lang attribute and cannot render Nastaliq (Urdu) or other
 * complex scripts. This component uses react-day-picker with per-locale
 * month/weekday names and applies the correct font automatically.
 *
 * Supported locales with native date-fns translations:
 *   ar-SA, tr, id, ms, hi, fa-IR
 * Urdu (ur): custom month/weekday arrays (not in date-fns).
 */

import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { arSA as ar } from 'date-fns/locale/ar-SA';
import { tr } from 'date-fns/locale/tr';
import { id } from 'date-fns/locale/id';
import { ms } from 'date-fns/locale/ms';
import { hi } from 'date-fns/locale/hi';
import { faIR } from 'date-fns/locale/fa-IR';
import type { Locale as DFLocale } from 'date-fns';
import 'react-day-picker/style.css';

// ── Urdu month + weekday names (Gregorian calendar, Nastaliq script) ──────────
const UR_MONTHS = [
  'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
  'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];
const UR_WEEKDAYS_SHORT = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];

// ── Locale → date-fns locale map (Urdu handled via custom formatters) ─────────
const LOCALE_MAP: Partial<Record<string, DFLocale>> = {
  ar:   ar,
  tr:   tr,
  id:   id,
  ms:   ms,
  hi:   hi,
  fa:   faIR,
};

// ── ISO yyyy-MM-dd helpers ────────────────────────────────────────────────────
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fromISO(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? undefined : date;
}
function formatDisplay(d: Date, lang: string): string {
  if (lang === 'ur') {
    return `${UR_MONTHS[d.getMonth()]} ${d.getDate()}، ${d.getFullYear()}`;
  }
  try {
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : lang, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return toISO(d);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  label: string;
  value: string;           // ISO yyyy-MM-dd
  onChange: (iso: string) => void;
  min?: string;            // ISO yyyy-MM-dd
  lang?: string;           // BCP-47 locale code
  className?: string;
}

export default function LocaleDatePicker({
  label,
  value,
  onChange,
  min,
  lang = 'en',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isRTL = ['ar', 'ur', 'fa'].includes(lang);
  const selected = fromISO(value);
  const minDate  = min ? fromISO(min) : undefined;

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(toISO(day));
      setOpen(false);
    }
  }

  // Urdu uses custom formatters; other RTL/complex locales use date-fns
  const dfLocale = LOCALE_MAP[lang];
  const isUrdu = lang === 'ur';

  const urduFormatters = isUrdu ? {
    formatMonthCaption: (month: Date) =>
      `${UR_MONTHS[month.getMonth()]} ${month.getFullYear()}`,
    formatWeekdayName: (weekday: Date) =>
      UR_WEEKDAYS_SHORT[weekday.getDay()],
  } : undefined;

  // Nastaliq font override for Urdu calendar
  const calendarFont: React.CSSProperties | undefined = isUrdu
    ? { fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: '1rem', lineHeight: 2 }
    : undefined;

  return (
    <div
      ref={wrapperRef}
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`relative flex flex-col gap-1 ${className}`}
    >
      {/* Label */}
      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white flex items-center justify-between gap-2 min-h-[44px]"
        style={isUrdu ? { fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: '1rem', lineHeight: 1.8 } : undefined}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? formatDisplay(selected, lang) : '—'}
        </span>
        {/* Calendar icon */}
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {/* Calendar popup */}
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={[
            'absolute z-50 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-200 p-3',
            isRTL ? 'right-0' : 'left-0',
          ].join(' ')}
          style={calendarFont}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? (minDate ?? new Date())}
            disabled={minDate ? { before: minDate } : undefined}
            dir={isRTL ? 'rtl' : 'ltr'}
            locale={dfLocale}
            formatters={urduFormatters}
          />
        </div>
      )}
    </div>
  );
}
