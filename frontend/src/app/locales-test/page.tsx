import { useTranslations } from 'next-intl';
import { LOCALES, LOCALE_FONTS, LOCALE_CURRENCY, isRTL } from '@/i18n/config';
import { getLocaleAttrs } from '@/lib/tenant';

export default function LocaleTestPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🌍 Multilingual Support Test</h1>

        {/* Quick reference table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Locale</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Language</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Currency</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">RTL</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Font</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {LOCALES.map((locale) => (
                <tr key={locale} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-blue-600">{locale}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span style={{ fontFamily: LOCALE_FONTS[locale] }}>
                      {locale === 'en' && 'English'}
                      {locale === 'ar' && 'العربية'}
                      {locale === 'tr' && 'Türkçe'}
                      {locale === 'id' && 'Bahasa Indonesia'}
                      {locale === 'ms' && 'Bahasa Melayu'}
                      {locale === 'ur' && 'اردو'}
                      {locale === 'hi' && 'हिन्दी'}
                      {locale === 'fa' && 'فارسی'}
                      {locale === 'fr' && 'Français'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{LOCALE_CURRENCY[locale]}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isRTL(locale) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isRTL(locale) ? 'RTL ⬅' : 'LTR ➡'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-xs text-gray-600">
                    {LOCALE_FONTS[locale].split(',')[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sample text renders */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sample Renderings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOCALES.map((locale) => {
            const fontFamily = LOCALE_FONTS[locale];
            const isRTLLocale = isRTL(locale);

            return (
              <div
                key={locale}
                className="bg-white rounded-lg shadow p-6"
                style={{
                  fontFamily,
                  direction: isRTLLocale ? 'rtl' : 'ltr',
                  textAlign: isRTLLocale ? 'right' : 'left',
                }}
              >
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded mb-2">
                    {locale}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {locale === 'en' && 'Welcome to UTUBooking'}
                  {locale === 'ar' && 'أهلاً بك في UTUBooking'}
                  {locale === 'tr' && 'UTUBooking\'a Hoşgeldiniz'}
                  {locale === 'id' && 'Selamat Datang di UTUBooking'}
                  {locale === 'ms' && 'Selamat Datang ke UTUBooking'}
                  {locale === 'ur' && 'UTUBooking میں خوش آمدید'}
                  {locale === 'hi' && 'UTUBooking में आपका स्वागत है'}
                  {locale === 'fa' && 'خوش آمدید به UTUBooking'}
                  {locale === 'fr' && 'Bienvenue chez UTUBooking'}
                </h3>

                <p className="text-xs text-gray-600 mb-3">
                  {locale === 'en' && 'Hotels, flights, and cars for Hajj & Umrah.'}
                  {locale === 'ar' && 'فنادق ورحلات وسيارات للحج والعمرة.'}
                  {locale === 'tr' && 'Hac ve Umre için oteller, uçuşlar ve arabalar.'}
                  {locale === 'id' && 'Hotel, penerbangan, dan mobil untuk Haji & Umrah.'}
                  {locale === 'ms' && 'Hotel, penerbangan, dan kereta untuk Haji & Umrah.'}
                  {locale === 'ur' && 'حج اور عمرہ کے لیے ہوٹلز، پروازیں اور کاریں۔'}
                  {locale === 'hi' && 'हज और उमराह के लिए होटल, उड़ानें और कारें।'}
                  {locale === 'fa' && 'هتل‌ها، پروازها و خودروها برای حج و عمره.'}
                  {locale === 'fr' && 'Hôtels, vols et voitures pour le Hajj et la Umrah.'}
                </p>

                <div className="text-xs text-gray-500 border-t pt-2">
                  <div>Font: {LOCALE_FONTS[locale].split(',')[0]}</div>
                  <div>Direction: {isRTLLocale ? '← RTL' : 'LTR →'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integration instructions */}
        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Integration Guide</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">How to use the locale switcher:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Import <code className="bg-white px-2 py-1 rounded text-xs font-mono">LocaleSwitcher</code> from <code className="bg-white px-2 py-1 rounded text-xs font-mono">@/components/LocaleSwitcher</code></li>
            <li>Add it to your header/navbar component</li>
            <li>Clicking a locale will redirect with the new locale in the query params</li>
            <li>Middleware will read the query param and set the tenant locale cookie/header</li>
            <li>The page will re-render with the new language and font</li>
          </ol>

          <h3 className="font-semibold text-gray-900 mt-4">To add a new locale:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Add the locale code to <code className="bg-white px-2 py-1 rounded text-xs font-mono">LOCALES</code> in <code className="bg-white px-2 py-1 rounded text-xs font-mono">frontend/src/i18n/config.ts</code></li>
            <li>Add RTL setting in <code className="bg-white px-2 py-1 rounded text-xs font-mono">RTL_LOCALES</code> if needed</li>
            <li>Add font and currency in the respective objects</li>
            <li>Create <code className="bg-white px-2 py-1 rounded text-xs font-mono">frontend/locales/{'{locale}'}.json</code> with all translation keys</li>
            <li>Add CSS rules in <code className="bg-white px-2 py-1 rounded text-xs font-mono">frontend/src/app/globals.css</code> for the <code className="bg-white px-2 py-1 rounded text-xs font-mono">[lang]</code> selector if using complex scripts</li>
            <li>Install font packages if needed: <code className="bg-white px-2 py-1 rounded text-xs font-mono">npm install @fontsource/font-name</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
