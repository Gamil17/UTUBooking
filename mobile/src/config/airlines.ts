/**
 * airlines.ts
 *
 * Airline and airport metadata for the UTUBooking mobile app.
 * Used by the flight search UI for logos, display names (EN/AR), and airport picker.
 *
 * Brand colours follow UTUBooking palette:
 *   primary green #10B981 | dark #111827 | gray #6B7280
 */

export interface AirlineMeta {
  name: string;
  nameAr: string;
  logo: string;         // filename in assets/airlines/
  type: 'FSC' | 'LCC'; // Full Service Carrier | Low Cost Carrier
  hub: string;          // Primary hub IATA
  country: string;
  countryAr: string;
}

export interface AirportMeta {
  code: string;
  name: string;
  nameAr: string;
  city: string;
  cityAr: string;
  country: string;
  countryAr: string;
  timezone: string;
  currency: string;
  flag: string;         // Emoji flag for quick identification
}

// ─── Airline Registry ──────────────────────────────────────────────────────

export const AIRLINE_META: Record<string, AirlineMeta> = {
  // Full Service Carriers
  SV: { name: 'Saudia',               nameAr: 'الخطوط السعودية',         logo: 'saudia.png',      type: 'FSC', hub: 'JED', country: 'Saudi Arabia', countryAr: 'المملكة العربية السعودية' },
  EK: { name: 'Emirates',             nameAr: 'طيران الإمارات',           logo: 'emirates.png',    type: 'FSC', hub: 'DXB', country: 'UAE',          countryAr: 'الإمارات' },
  EY: { name: 'Etihad',               nameAr: 'الاتحاد للطيران',          logo: 'etihad.png',      type: 'FSC', hub: 'AUH', country: 'UAE',          countryAr: 'الإمارات' },
  GF: { name: 'Gulf Air',             nameAr: 'طيران الخليج',             logo: 'gulfair.png',     type: 'FSC', hub: 'BAH', country: 'Bahrain',      countryAr: 'البحرين' },
  KU: { name: 'Kuwait Airways',       nameAr: 'الخطوط الجوية الكويتية',  logo: 'kuwait.png',      type: 'FSC', hub: 'KWI', country: 'Kuwait',       countryAr: 'الكويت' },
  RJ: { name: 'Royal Jordanian',      nameAr: 'الملكية الأردنية',         logo: 'rj.png',          type: 'FSC', hub: 'AMM', country: 'Jordan',       countryAr: 'الأردن' },
  QR: { name: 'Qatar Airways',        nameAr: 'الخطوط القطرية',           logo: 'qatar.png',       type: 'FSC', hub: 'DOH', country: 'Qatar',        countryAr: 'قطر' },
  MS: { name: 'EgyptAir',             nameAr: 'مصر للطيران',              logo: 'egyptair.png',    type: 'FSC', hub: 'CAI', country: 'Egypt',        countryAr: 'مصر' },
  AT: { name: 'Royal Air Maroc',      nameAr: 'الخطوط الملكية المغربية', logo: 'ram.png',          type: 'FSC', hub: 'CMN', country: 'Morocco',      countryAr: 'المغرب' },
  TU: { name: 'Tunisair',             nameAr: 'الخطوط التونسية',          logo: 'tunisair.png',    type: 'FSC', hub: 'TUN', country: 'Tunisia',      countryAr: 'تونس' },

  // New LCCs — March 2026 expansion
  FZ: { name: 'Flydubai',             nameAr: 'فلاي دبي',                 logo: 'flydubai.png',    type: 'LCC', hub: 'DXB', country: 'UAE',          countryAr: 'الإمارات' },
  F3: { name: 'Flyadeal',             nameAr: 'فلاي دييل',                logo: 'flyadeal.png',    type: 'LCC', hub: 'JED', country: 'Saudi Arabia', countryAr: 'المملكة العربية السعودية' },
  XY: { name: 'Flynas',               nameAr: 'طيران ناس',                logo: 'flynas.png',      type: 'LCC', hub: 'RUH', country: 'Saudi Arabia', countryAr: 'المملكة العربية السعودية' },
  '3O': { name: 'Air Arabia Maroc',   nameAr: 'العربية للطيران المغرب',   logo: 'airarabia-maroc.png', type: 'LCC', hub: 'CMN', country: 'Morocco', countryAr: 'المغرب' },
  BJ: { name: 'Nouvelair',            nameAr: 'نوفلير',                   logo: 'nouvelair.png',   type: 'LCC', hub: 'TUN', country: 'Tunisia',      countryAr: 'تونس' },
};

// ─── Airport Registry ──────────────────────────────────────────────────────
// Core airports + all 5 new airports from March 2026 expansion

export const AIRPORT_META: Record<string, AirportMeta> = {
  // Saudi Arabia
  RUH: { code: 'RUH', name: 'King Khalid International',    nameAr: 'مطار الملك خالد الدولي',          city: 'Riyadh',    cityAr: 'الرياض',        country: 'Saudi Arabia', countryAr: 'السعودية',  timezone: 'Asia/Riyadh',    currency: 'SAR', flag: '🇸🇦' },
  JED: { code: 'JED', name: 'King Abdulaziz International', nameAr: 'مطار الملك عبدالعزيز الدولي',    city: 'Jeddah',    cityAr: 'جدة',           country: 'Saudi Arabia', countryAr: 'السعودية',  timezone: 'Asia/Riyadh',    currency: 'SAR', flag: '🇸🇦' },
  MED: { code: 'MED', name: 'Prince Mohammad Bin Abdulaziz',nameAr: 'مطار الأمير محمد بن عبدالعزيز',  city: 'Madinah',   cityAr: 'المدينة المنورة',country: 'Saudi Arabia', countryAr: 'السعودية',  timezone: 'Asia/Riyadh',    currency: 'SAR', flag: '🇸🇦' },
  DMM: { code: 'DMM', name: 'King Fahd International',      nameAr: 'مطار الملك فهد الدولي',           city: 'Dammam',    cityAr: 'الدمام',        country: 'Saudi Arabia', countryAr: 'السعودية',  timezone: 'Asia/Riyadh',    currency: 'SAR', flag: '🇸🇦' },

  // UAE
  DXB: { code: 'DXB', name: 'Dubai International',          nameAr: 'مطار دبي الدولي',                 city: 'Dubai',     cityAr: 'دبي',           country: 'UAE',          countryAr: 'الإمارات',  timezone: 'Asia/Dubai',     currency: 'AED', flag: '🇦🇪' },
  AUH: { code: 'AUH', name: 'Abu Dhabi International',      nameAr: 'مطار أبوظبي الدولي',             city: 'Abu Dhabi', cityAr: 'أبوظبي',        country: 'UAE',          countryAr: 'الإمارات',  timezone: 'Asia/Dubai',     currency: 'AED', flag: '🇦🇪' },

  // New airports — March 2026 expansion
  AMM: { code: 'AMM', name: 'Queen Alia International',     nameAr: 'مطار الملكة علياء الدولي',        city: 'Amman',     cityAr: 'عمّان',         country: 'Jordan',       countryAr: 'الأردن',    timezone: 'Asia/Amman',     currency: 'JOD', flag: '🇯🇴' },
  KWI: { code: 'KWI', name: 'Kuwait International',         nameAr: 'مطار الكويت الدولي',              city: 'Kuwait City',cityAr: 'مدينة الكويت', country: 'Kuwait',       countryAr: 'الكويت',    timezone: 'Asia/Kuwait',    currency: 'KWD', flag: '🇰🇼' },
  BAH: { code: 'BAH', name: 'Bahrain International',        nameAr: 'مطار البحرين الدولي',             city: 'Manama',    cityAr: 'المنامة',       country: 'Bahrain',      countryAr: 'البحرين',   timezone: 'Asia/Bahrain',   currency: 'BHD', flag: '🇧🇭' },
  CMN: { code: 'CMN', name: 'Mohammed V International',     nameAr: 'مطار محمد الخامس الدولي',         city: 'Casablanca',cityAr: 'الدار البيضاء', country: 'Morocco',      countryAr: 'المغرب',    timezone: 'Africa/Casablanca',currency: 'MAD',flag: '🇲🇦' },
  TUN: { code: 'TUN', name: 'Tunis-Carthage International', nameAr: 'مطار تونس قرطاج الدولي',          city: 'Tunis',     cityAr: 'تونس',          country: 'Tunisia',      countryAr: 'تونس',      timezone: 'Africa/Tunis',   currency: 'TND', flag: '🇹🇳' },
};

/** Returns display name respecting current locale. */
export function getAirlineName(code: string, locale: 'en' | 'ar' = 'en'): string {
  const meta = AIRLINE_META[code];
  if (!meta) return code;
  return locale === 'ar' ? meta.nameAr : meta.name;
}

/** Returns display name for an airport respecting current locale. */
export function getAirportName(code: string, locale: 'en' | 'ar' = 'en'): string {
  const meta = AIRPORT_META[code];
  if (!meta) return code;
  return locale === 'ar'
    ? `${meta.nameAr} — ${meta.cityAr}`
    : `${meta.name} — ${meta.city}`;
}

/** Returns true if the airport code is enabled on the platform. */
export function isAirportEnabled(code: string): boolean {
  return code in AIRPORT_META;
}

/** Sorted list of airport codes for the airport picker dropdown. */
export const SORTED_AIRPORT_CODES: string[] = Object.keys(AIRPORT_META).sort();
