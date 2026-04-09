import { notFound } from 'next/navigation';
import { LOCALES, LOCALE_FONTS, LOCALE_CURRENCY, LOCALE_NAMES, isRTL } from '@/i18n/config';

export default function LocaleTestPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="min-h-screen bg-utu-bg-muted py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-utu-text-primary mb-8">🌍 Multilingual Support Test</h1>

        {/* Quick reference table */}
        <div className="bg-utu-bg-card rounded-lg shadow overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-utu-border-default">
            <thead className="bg-utu-bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-utu-text-primary">Locale</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-utu-text-primary">Language</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-utu-text-primary">Currency</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-utu-text-primary">RTL</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-utu-text-primary">Font</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {LOCALES.map((locale) => (
                <tr key={locale} className="hover:bg-utu-bg-muted">
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-blue-600">{locale}</td>
                  <td className="px-6 py-4 text-sm text-utu-text-primary">
                    <span style={{ fontFamily: LOCALE_FONTS[locale] }}>
                      {LOCALE_NAMES[locale]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-utu-text-primary">{LOCALE_CURRENCY[locale]}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isRTL(locale) ? 'bg-blue-100 text-blue-800' : 'bg-utu-bg-muted text-utu-text-primary'
                    }`}>
                      {isRTL(locale) ? 'RTL ⬅' : 'LTR ➡'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-xs text-utu-text-secondary">
                    {LOCALE_FONTS[locale].split(',')[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sample text renders */}
        <h2 className="text-2xl font-bold text-utu-text-primary mb-4">Sample Renderings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOCALES.map((locale) => {
            const fontFamily = LOCALE_FONTS[locale];
            const isRTLLocale = isRTL(locale);

            return (
              <div
                key={locale}
                className="bg-utu-bg-card rounded-lg shadow p-6"
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

                <h3 className="text-sm font-semibold text-utu-text-primary mb-3">
                  {locale === 'en'     && 'Welcome to UTUBooking'}
                  {locale === 'ar'     && 'أهلاً بك في UTUBooking'}
                  {locale === 'tr'     && "UTUBooking'a Hoşgeldiniz"}
                  {locale === 'id'     && 'Selamat Datang di UTUBooking'}
                  {locale === 'ms'     && 'Selamat Datang ke UTUBooking'}
                  {locale === 'ur'     && 'UTUBooking میں خوش آمدید'}
                  {locale === 'hi'     && 'UTUBooking में आपका स्वागत है'}
                  {locale === 'fa'     && 'خوش آمدید به UTUBooking'}
                  {locale === 'fr'     && 'Bienvenue chez UTUBooking'}
                  {locale === 'de'     && 'Willkommen bei UTUBooking'}
                  {locale === 'en-GB'  && 'Welcome to UTUBooking'}
                  {locale === 'en-US'  && 'Welcome to UTUBooking'}
                  {locale === 'it'     && 'Benvenuto su UTUBooking'}
                  {locale === 'nl'     && 'Welkom bij UTUBooking'}
                  {locale === 'pl'     && 'Witamy w UTUBooking'}
                  {locale === 'es'     && 'Bienvenido a UTUBooking'}
                  {locale === 'sv'     && 'Välkommen till UTUBooking'}
                  {locale === 'ru'     && 'Добро пожаловать в UTUBooking'}
                  {locale === 'pt-BR'  && 'Bem-vindo ao UTUBooking'}
                  {locale === 'es-419' && 'Bienvenido a UTUBooking'}
                  {locale === 'ja'     && 'UTUBookingへようこそ'}
                  {locale === 'ko'     && 'UTUBooking에 오신 것을 환영합니다'}
                  {locale === 'th'     && 'ยินดีต้อนรับสู่ UTUBooking'}
                  {locale === 'vi'     && 'Chào mừng đến với UTUBooking'}
                  {locale === 'zh-CN'  && '欢迎使用 UTUBooking'}
                  {locale === 'zh-HK'  && '歡迎使用 UTUBooking'}
                  {locale === 'zh-TW'  && '歡迎使用 UTUBooking'}
                </h3>

                <p className="text-xs text-utu-text-secondary mb-3">
                  {locale === 'en'     && 'Hotels, flights, and cars for Hajj & Umrah.'}
                  {locale === 'ar'     && 'فنادق ورحلات وسيارات للحج والعمرة.'}
                  {locale === 'tr'     && 'Hac ve Umre için oteller, uçuşlar ve arabalar.'}
                  {locale === 'id'     && 'Hotel, penerbangan, dan mobil untuk Haji & Umrah.'}
                  {locale === 'ms'     && 'Hotel, penerbangan, dan kereta untuk Haji & Umrah.'}
                  {locale === 'ur'     && 'حج اور عمرہ کے لیے ہوٹلز، پروازیں اور کاریں۔'}
                  {locale === 'hi'     && 'हज और उमराह के लिए होटल, उड़ानें और कारें।'}
                  {locale === 'fa'     && 'هتل‌ها، پروازها و خودروها برای حج و عمره.'}
                  {locale === 'fr'     && 'Hôtels, vols et voitures pour le Hajj et la Umrah.'}
                  {locale === 'de'     && 'Hotels, Flüge und Autos für Hajj & Umrah.'}
                  {locale === 'en-GB'  && 'Hotels, flights, and cars for Hajj & Umrah.'}
                  {locale === 'en-US'  && 'Hotels, flights, and cars for Hajj & Umrah.'}
                  {locale === 'it'     && 'Hotel, voli e auto per Hajj e Umrah.'}
                  {locale === 'nl'     && "Hotels, vluchten en auto's voor Hajj & Umrah."}
                  {locale === 'pl'     && 'Hotele, loty i samochody na Hadżdż i Umrę.'}
                  {locale === 'es'     && 'Hoteles, vuelos y coches para el Hajj y la Umrah.'}
                  {locale === 'sv'     && 'Hotell, flyg och bilar för Hajj och Umrah.'}
                  {locale === 'ru'     && 'Отели, рейсы и автомобили для хаджа и умры.'}
                  {locale === 'pt-BR'  && 'Hotéis, voos e carros para o Hajj e Umrah.'}
                  {locale === 'es-419' && 'Hoteles, vuelos y autos para el Hajj y la Umrah.'}
                  {locale === 'ja'     && '巡礼・ウムラのためのホテル、フライト、レンタカー。'}
                  {locale === 'ko'     && '하지와 우므라를 위한 호텔, 항공편, 렌터카.'}
                  {locale === 'th'     && 'โรงแรม เที่ยวบิน และรถยนต์สำหรับฮัจญ์และอุมเราะห์'}
                  {locale === 'vi'     && 'Khách sạn, chuyến bay và xe hơi cho Hajj & Umrah.'}
                  {locale === 'zh-CN'  && '为朝觐和副朝提供酒店、机票及租车服务。'}
                  {locale === 'zh-HK'  && '為朝覲及副朝提供酒店、機票及租車服務。'}
                  {locale === 'zh-TW'  && '為朝覲及副朝提供飯店、機票及租車服務。'}
                </p>

                <div className="text-xs text-utu-text-muted border-t pt-2">
                  <div>Font: {LOCALE_FONTS[locale].split(',')[0]}</div>
                  <div>Direction: {isRTLLocale ? '← RTL' : 'LTR →'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integration instructions */}
        <h2 className="text-2xl font-bold text-utu-text-primary mt-12 mb-4">Integration Guide</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-utu-text-primary">How to use the locale switcher:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-utu-text-secondary">
            <li>Import <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">LocaleSwitcher</code> from <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">@/components/LocaleSwitcher</code></li>
            <li>Add it to your header/navbar component</li>
            <li>Clicking a locale will redirect with the new locale in the query params</li>
            <li>Middleware will read the query param and set the tenant locale cookie/header</li>
            <li>The page will re-render with the new language and font</li>
          </ol>

          <h3 className="font-semibold text-utu-text-primary mt-4">To add a new locale:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-utu-text-secondary">
            <li>Add the locale code to <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">LOCALES</code> in <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">frontend/src/i18n/config.ts</code></li>
            <li>Add RTL setting in <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">RTL_LOCALES</code> if needed</li>
            <li>Add font and currency in the respective objects</li>
            <li>Create <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">frontend/locales/{'{locale}'}.json</code> with all translation keys</li>
            <li>Add CSS rules in <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">frontend/src/app/globals.css</code> for the <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">[lang]</code> selector if using complex scripts</li>
            <li>Install font packages if needed: <code className="bg-utu-bg-card px-2 py-1 rounded text-xs font-mono">npm install @fontsource/font-name</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
