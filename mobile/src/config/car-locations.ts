/**
 * car-locations.ts
 *
 * Canonical CarTrawler airport locations for the UTUBooking mobile app.
 * Includes existing locations + 5 new airports (March 2026 expansion).
 *
 * Display convention (per UTUBooking brand):
 *   - SAR price shown first; original local currency in parentheses
 *   - Arabic names used when i18n locale = 'ar' (RTL layout)
 *   - WCAG 2.1 AA: location picker items must have minHeight: 44
 *     and accessibilityLabel = locationAccessibilityLabel(loc, locale)
 */

export interface CarLocation {
  /** IATA airport code (uppercase, 3 letters) */
  code: string;
  /** English airport display name */
  name: string;
  /** Arabic airport display name */
  nameAr: string;
  /** English city */
  city: string;
  /** Arabic city */
  cityAr: string;
  /** English country */
  country: string;
  /** Arabic country */
  countryAr: string;
  /** ISO 4217 local currency */
  currency: string;
  /** Country flag emoji */
  flag: string;
  /** false = show as "coming soon" greyed out in picker */
  enabled: boolean;
}

export const CAR_LOCATIONS: CarLocation[] = [
  // ── Existing locations ──────────────────────────────────────────────────────
  {
    code: 'JED', name: 'King Abdulaziz International Airport',
    nameAr: 'مطار الملك عبدالعزيز الدولي',
    city: 'Jeddah', cityAr: 'جدة',
    country: 'Saudi Arabia', countryAr: 'المملكة العربية السعودية',
    currency: 'SAR', flag: '🇸🇦', enabled: true,
  },
  {
    code: 'RUH', name: 'King Khalid International Airport',
    nameAr: 'مطار الملك خالد الدولي',
    city: 'Riyadh', cityAr: 'الرياض',
    country: 'Saudi Arabia', countryAr: 'المملكة العربية السعودية',
    currency: 'SAR', flag: '🇸🇦', enabled: true,
  },
  {
    code: 'DXB', name: 'Dubai International Airport',
    nameAr: 'مطار دبي الدولي',
    city: 'Dubai', cityAr: 'دبي',
    country: 'UAE', countryAr: 'الإمارات العربية المتحدة',
    currency: 'AED', flag: '🇦🇪', enabled: true,
  },
  {
    code: 'AUH', name: 'Abu Dhabi International Airport',
    nameAr: 'مطار أبوظبي الدولي',
    city: 'Abu Dhabi', cityAr: 'أبوظبي',
    country: 'UAE', countryAr: 'الإمارات العربية المتحدة',
    currency: 'AED', flag: '🇦🇪', enabled: true,
  },
  {
    code: 'CAI', name: 'Cairo International Airport',
    nameAr: 'مطار القاهرة الدولي',
    city: 'Cairo', cityAr: 'القاهرة',
    country: 'Egypt', countryAr: 'مصر',
    currency: 'EGP', flag: '🇪🇬', enabled: true,
  },
  // ── New locations — March 2026 expansion ────────────────────────────────────
  {
    code: 'AMM', name: 'Queen Alia International Airport',
    nameAr: 'مطار الملكة علياء الدولي',
    city: 'Amman', cityAr: 'عمّان',
    country: 'Jordan', countryAr: 'الأردن',
    currency: 'JOD', flag: '🇯🇴', enabled: true,
  },
  {
    code: 'KWI', name: 'Kuwait International Airport',
    nameAr: 'مطار الكويت الدولي',
    city: 'Kuwait City', cityAr: 'مدينة الكويت',
    country: 'Kuwait', countryAr: 'الكويت',
    currency: 'KWD', flag: '🇰🇼', enabled: true,
  },
  {
    code: 'BAH', name: 'Bahrain International Airport',
    nameAr: 'مطار البحرين الدولي',
    city: 'Manama', cityAr: 'المنامة',
    country: 'Bahrain', countryAr: 'البحرين',
    currency: 'BHD', flag: '🇧🇭', enabled: true,
  },
  {
    code: 'CMN', name: 'Mohammed V International Airport',
    nameAr: 'مطار محمد الخامس الدولي',
    city: 'Casablanca', cityAr: 'الدار البيضاء',
    country: 'Morocco', countryAr: 'المغرب',
    currency: 'MAD', flag: '🇲🇦', enabled: true,
  },
  {
    code: 'TUN', name: 'Tunis-Carthage International Airport',
    nameAr: 'مطار تونس قرطاج الدولي',
    city: 'Tunis', cityAr: 'تونس',
    country: 'Tunisia', countryAr: 'تونس',
    currency: 'TND', flag: '🇹🇳', enabled: true,
  },
];

/** Look up a location by IATA code (case-insensitive). */
export function getCarLocation(code: string): CarLocation | undefined {
  return CAR_LOCATIONS.find((l) => l.code === code.toUpperCase());
}

/** Enabled locations sorted alphabetically by English city name. */
export function getEnabledCarLocations(): CarLocation[] {
  return CAR_LOCATIONS.filter((l) => l.enabled).sort((a, b) => a.city.localeCompare(b.city));
}

/** Enabled locations sorted for Arabic display (cityAr). */
export function getEnabledCarLocationsAr(): CarLocation[] {
  return CAR_LOCATIONS.filter((l) => l.enabled).sort((a, b) => a.cityAr.localeCompare(b.cityAr, 'ar'));
}

/**
 * WCAG 2.1 AA accessibilityLabel for a location picker item.
 * @param location - CarLocation
 * @param locale   - 'en' | 'ar'
 */
export function locationAccessibilityLabel(location: CarLocation, locale: 'en' | 'ar' = 'en'): string {
  if (locale === 'ar') {
    return `${location.nameAr}، ${location.cityAr}، ${location.countryAr}`;
  }
  return `${location.name}, ${location.city}, ${location.country}`;
}
