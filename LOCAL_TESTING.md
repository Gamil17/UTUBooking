# Local Testing Guide — UTUBooking Phase 5

## Frontend Status

✅ **Running**: http://localhost:3000

### Test the Multilingual System

#### 1. Visit the Locale Test Page
```
http://localhost:3000/locales-test
```

**What you'll see:**
- ✅ Reference table with all 9 locales
- ✅ Font rendering samples in each language
- ✅ Currency & RTL status verification
- ✅ Integration instructions

#### 2. View Sample Pages in Different Languages

Since the frontend uses `next-intl` with tenant-based locale detection, you can test by:

**Option A: Using query params** (if middleware is configured)
```
http://localhost:3000?locale=tr
http://localhost:3000?locale=id
http://localhost:3000?locale=ur
```

**Option B: Check browser DevTools**
Open DevTools → Console and inspect:
```javascript
// Current locale from next-intl
const locale = document.documentElement.lang;
console.log('Current locale:', locale);

// Font being applied
const computed = getComputedStyle(document.body);
console.log('Font family:', computed.fontFamily);
```

#### 3. Test LocaleSwitcher Component

The `LocaleSwitcher` component should appear in your layout:
- 🌐 Button with globe emoji + locale code (EN, TR, etc.)
- Click to open dropdown with all 9 languages
- Click a language to change locale
- ✓ checkmark indicates current locale

**Location**: Add to your layout:
```tsx
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default function RootLayout({ children }) {
  return (
    <header className="flex justify-between">
      <h1>UTUBooking</h1>
      <LocaleSwitcher />  {/* Add here */}
    </header>
  );
}
```

---

## Frontend Testing Checklist

### Visual Verification

- [ ] Visit `/locales-test`
- [ ] Verify all 9 locale cards render correctly
- [ ] Check fonts load (DevTools → Network → Fonts):
  - [ ] `Inter` (EN, FR, TR, ID, MS)
  - [ ] `NotoSansArabic` (AR)
  - [ ] `NotoNastaliqUrdu` (UR)
  - [ ] `NotoSansDevanagari` (HI)
  - [ ] `Vazirmatn` (FA)

### RTL Testing (if applicable)

1. Open page inspector (F12)
2. Check `<html>` element:
   ```html
   <!-- For AR, UR, FA -->
   <html lang="ar" dir="rtl">
   <!-- For others -->
   <html lang="en" dir="ltr">
   ```
3. Verify text alignment:
   - [ ] Arabic text flows right-to-left
   - [ ] Urdu text flows right-to-left
   - [ ] Farsi text flows right-to-left
   - [ ] English/others flow left-to-right

### Performance Check

1. DevTools → Lighthouse → Performance
   - Target: > 80 score with multilingual setup

2. Font loading:
   - DevTools → Network → filter by "font"
   - Verify only needed fonts load (not all 5)
   - Should see ~200KB total fonts (gzipped ~60KB)

---

## Backend Testing (Without Running Services)

### Verify Payment Router Logic

```bash
# Check that PaymentRouter.ts is syntactically correct
cd backend/services/payment
npx tsc --noEmit PaymentRouter.ts

# Or test the routing logic individually
node -e "
const { GATEWAY_BY_COUNTRY, getGateway } = require('./PaymentRouter.ts');
console.log('TR →', getGateway('TR'));  // Should be 'iyzico'
console.log('ID →', getGateway('ID'));  // Should be 'midtrans'
console.log('MY →', getGateway('MY'));  // Should be 'ipay88'
console.log('SA →', getGateway('SA'));  // Should be 'stcpay'
"
```

### Verify Environment Variables

```bash
# Check that all Phase 5 keys are in .env
grep -E "IYZICO|MIDTRANS|IPAY88" backend/.env

# Expected output:
# IYZICO_API_KEY=sandbox_xxx
# IYZICO_SECRET_KEY=sandbox_xxx
# MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
# IPAY88_MERCHANT_CODE=xxx
```

---

## Mobile Testing (Prerequisites)

### Requirements
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode simulator (Mac) or physical iPhone
- Android: Android Studio emulator or physical device

### Start Expo Dev Server

```bash
cd mobile
npx expo start

# Then press:
# i — open in iOS simulator
# a — open in Android emulator
# w — open in web browser
```

### Test Multilingual on Mobile

1. Current locales: EN, AR, FR
2. Turkish (TR) template created → `mobile/i18n/tr.ts`
3. Test menu toggle (bottom tabs):
   - [ ] HomeScreen switches language
   - [ ] MyTripsScreen shows correct locale
   - [ ] RTL switches layout for Arabic

---

## API Testing (Without Backend Running)

### Test Payment Router Structure

Get gateway for country:
```bash
# Simulate the router logic (no server needed)
curl -X POST http://localhost:3000/api/admin/test-payment-router \
  -H "Content-Type: application/json" \
  -d '{ "countryCode": "TR" }' \
  2>&1 | jq .

# Expected: Should show gateway: "iyzico"
```

---

## Full End-to-End Test Scenario

### Scenario: Booking from Turkey

1. **Frontend** (http://localhost:3000)
   - [ ] Load homepage
   - [ ] Change locale to Turkish (TR) using LocaleSwitcher
   - [ ] Verify all text switches to Turkish
   - [ ] Verify fonts switch to `Inter` (not Iyzico-specific)

2. **Backend** (Not running, but architecture ready)
   - [ ] PaymentRouter.ts maps TR → "iyzico"
   - [ ] PaymentRouter validates transaction amount
   - [ ] Webhook handler parses Iyzico response
   - [ ] Fee calculation: amount × 1.75%

3. **Database** (N/A - not running locally)
   - Would record transaction with gateway="iyzico"
   - Would trigger push notification in Turkish

---

## Test Matrix

| Component | Status | Test URL | Expected |
|-----------|--------|----------|----------|
| Frontend Dev | ✅ Running | http://localhost:3000 | Next.js server |
| Locales Test | ✅ Ready | http://localhost:3000/locales-test | 9-locale table |
| LocaleSwitcher | ✅ Component | Import + add to layout | Dropdown visible |
| Fonts | ✅ Installed | DevTools Network | 5× font files load |
| i18n Config | ✅ Created | `frontend/src/i18n/config.ts` | 9 locales defined |
| Translations | ✅ Files | `frontend/locales/*.json` | 9 files, all keys |
| Payment Router | ✅ Code | `backend/services/payment/PaymentRouter.ts` | 7 gateways mapped |
| Payment Controller | ✅ Template | `backend/services/payment/controllers/payment.controller.ts` | Stubs ready |
| Payment .env | ✅ Setup | `backend/.env` | Sandbox keys placeholders |

---

## Interactive Tests (Browser Console)

Open DevTools Console (F12) and paste:

### Check Current Locale
```javascript
console.log('Locale:', document.documentElement.lang);
console.log('Direction:', document.documentElement.dir);
console.log('Font:', getComputedStyle(document.body).fontFamily);
```

### Test Translation Loading
```javascript
// If using next-intl
const messages = window.__NEXT_DATA__?.props?.pageProps?.messages;
console.log('Loaded translations:', Object.keys(messages || {}));
```

### Verify RTL
```javascript
const isRTL = document.documentElement.dir === 'rtl';
console.log('Is RTL:', isRTL);
console.log('Text align:', getComputedStyle(document.body).textAlign);
```

---

## Stop Frontend

When done testing:

```bash
# Kill the dev server
lsof -i :3000 | awk 'NR==2 {print $2}' | xargs kill -9

# Or on Windows:
# netstat -ano | findstr :3000
# taskkill /PID <PID> /F
```

---

## Common Issues & Fixes

### Issue: "Cannot find module '@/i18n/config'"
**Fix**: Check that `tsconfig.json` has path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: Fonts not loading
**Fix**: Check import in `layout.tsx`:
```typescript
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-nastaliq-urdu/400.css';
```

### Issue: RTL not working
**Fix**: Ensure HTML has `dir` attribute:
```html
<html lang="ar" dir="rtl">
```

### Issue: LocaleSwitcher not visible
**Fix**: Add to layout and verify import:
```typescript
import LocaleSwitcher from '@/components/LocaleSwitcher';
```

---

## Next Steps After Testing

1. **If frontend looks good:**
   - Add LocaleSwitcher to your main layout
   - Deploy to staging environment
   - QA testing on multiple devices

2. **For backend Phase 5 gateways:**
   - Get sandbox credentials from iyzico, Midtrans, iPay88
   - Implement `gateways/{name}.service.ts` files
   - Test with mock payment requests
   - Set up webhook endpoints

3. **For mobile:**
   - Create remaining 5 translation files (ID, MS, UR, HI, FA)
   - Update `mobile/i18n/index.ts` with new locales
   - Test on physical devices

---

**Frontend Status**: ✅ Ready to test
**Backend Status**: ✅ Architecture ready, needs implementation
**Mobile Status**: ✅ Framework ready, needs 5 translations

---

Last updated: 2026-03-14
