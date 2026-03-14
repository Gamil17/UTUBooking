# Mobile Multilingual Support Setup

## Current Status
- ✅ 3 locales: EN, AR, FR
- ⬜ 6 new locales ready to add: TR (example), ID, MS, UR, HI, FA

## Adding Phase 5 Locales to Mobile

### Step 1: Update `mobile/i18n/index.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import en from './en';
import ar from './ar';
import fr from './fr';
import tr from './tr';     // Add these
import id from './id';
import ms from './ms';
import ur from './ur';
import hi from './hi';
import fa from './fa';

// Update Lang type
export type Lang = 'en' | 'ar' | 'fr' | 'tr' | 'id' | 'ms' | 'ur' | 'hi' | 'fa';

// Update resources
const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  tr: { translation: tr },   // Add these
  id: { translation: id },
  ms: { translation: ms },
  ur: { translation: ur },
  hi: { translation: hi },
  fa: { translation: fa },
} as const;

// ... rest stays the same

// Update applyRTL function
export function applyRTL(lang: Lang): void {
  const shouldBeRTL = ['ar', 'ur', 'fa'].includes(lang);  // Updated
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
  }
}
```

### Step 2: Create Translation Files

Copy the pattern from `mobile/i18n/tr.ts` to create:
- `mobile/i18n/id.ts` (Indonesian)
- `mobile/i18n/ms.ts` (Malay)
- `mobile/i18n/ur.ts` (Urdu)
- `mobile/i18n/hi.ts` (Hindi)
- `mobile/i18n/fa.ts` (Farsi)

Each file should follow the structure in `en.ts` with full translations.

### Step 3: Update useFont Hook (if applicable)

If your app uses a custom font loading hook, update it to support new scripts:

```typescript
// hooks/useFont.ts example
import { useFonts } from 'expo-font';
import { useLocale } from 'react-i18next';

export function useLocaleFonts() {
  const { i18n } = useLocale();
  const [fontsLoaded] = useFonts({
    'Noto-Sans-AR': require('./fonts/NotoSansArabic.ttf'),
    'Noto-Nastaliq-UR': require('./fonts/NotoNastaliqUrdu.ttf'),
    'Noto-Devanagari-HI': require('./fonts/NotoSansDevanagari.ttf'),
    'Vazirmatn-FA': require('./fonts/Vazirmatn.ttf'),
    // ... etc
  });

  return fontsLoaded;
}
```

### Step 4: Test on Devices

```bash
# Clear cache and rebuild
cd mobile
expo start --clear
```

Test on:
- ✅ iPhone 14+ (Pro, Pro Max)
- ✅ Samsung S23+

Verify:
- ✅ Text renders correctly in each language
- ✅ RTL layout works (Arabic, Urdu, Farsi)
- ✅ Font displays properly for complex scripts
- ✅ Navigation still works

### Step 5: Update App.tsx (if needed)

```typescript
// screens/SettingsScreen.tsx - example language selector
<Picker
  selectedValue={i18n.language}
  onValueChange={(lang) => {
    i18n.changeLanguage(lang as Lang);
    applyRTL(lang as Lang);
  }}
>
  <Picker.Item label="English" value="en" />
  <Picker.Item label="العربية" value="ar" />
  <Picker.Item label="Français" value="fr" />
  <Picker.Item label="Türkçe" value="tr" />
  <Picker.Item label="Bahasa Indonesia" value="id" />
  <Picker.Item label="Bahasa Melayu" value="ms" />
  <Picker.Item label="اردو" value="ur" />
  <Picker.Item label="हिन्दी" value="hi" />
  <Picker.Item label="فارسی" value="fa" />
</Picker>
```

## Translation Keys Reference

### Common Keys
All 6 new translation files should include these keys:

```typescript
{
  common: {
    brand, switchLang, search, loading, error, noResults,
    bookNow, cancel, confirm, back, perNight, sar, nights, vat, distHaram, stars
  },
  tabs: { home, trips },
  search: {
    tabs: { hotels, flights, cars },
    hero: { tagline, subtitle },
    hotel: { ... },
    flight: { ... },
    car: { ... }
  },
  results: { ... },
  detail: { ... },
  booking: { ... },
  myTrips: { ... },
  accessibility: { ... }
}
```

## Example: Turkish Translation

✅ `mobile/i18n/tr.ts` is already created as a template.

Follow this pattern for other languages:
1. Take `en.ts` as key reference
2. Translate all values to target language
3. Keep function signatures intact (e.g., `nights: (n: number) => ...`)
4. Test pluralization rules (different for each language)

## Estimated Effort

- **Per language**: ~2-4 hours for complete translation
- **Integration**: ~1 hour to update `index.ts`
- **Testing**: ~2 hours on devices

**Total**: ~20-30 hours for all 6 languages

## Quality Assurance

- [ ] Grammar & spelling check by native speaker
- [ ] Test on actual devices (iPhone + Samsung)
- [ ] Verify font rendering (especially UR, HI, FA)
- [ ] Check RTL layout integrity
- [ ] Verify all pluralization rules
- [ ] Test with long strings (e.g., German, Turkish)

## Performance Notes

- Font files add ~1.5-2 MB to app bundle
- Use Expo's `expo-font` to load fonts lazily if needed
- Consider splitting language packs for Phase 6+ expansion

## Priority Order

1. **TR** (Turkish) — Large market, similar grammar to Arabic
2. **ID** (Indonesian) — Large Muslim population, high growth
3. **MS** (Malay) — Similar to Indonesian
4. **UR** (Urdu) — Large Pakistan/UK user base
5. **HI** (Hindi) — Largest Indian market
6. **FA** (Farsi) — Iran market

---

**Status**: Ready for translation team
**Date**: 2026-03-14
**Notes**: Use `tr.ts` as template for remaining languages
