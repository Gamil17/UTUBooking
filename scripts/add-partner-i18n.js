#!/usr/bin/env node
/**
 * add-partner-i18n.js
 *
 * Injects the `partner` i18n section into all locale JSON files.
 * Idempotent — skips files that already have the key.
 *
 * Usage:  node scripts/add-partner-i18n.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../frontend/locales');

// ─── Translations per locale ──────────────────────────────────────────────────
const PARTNER_TRANSLATIONS = {
  'en': {
    badge: 'Direct Partner',
    badgeTitle: 'UTUBooking Direct Partner',
    badgeDesc: 'Exclusive rates & perks when you book direct through UTUBooking',
    tier: { platinum: 'Platinum Partner', gold: 'Gold Partner', silver: 'Silver Partner', bronze: 'Bronze Partner' },
    distanceHaram: '{m}m from Al-Haram',
    freeCancellation: 'Free Cancellation',
    perNight: '/ night',
    book: 'Book Now',
    perks: {
      earlyCheckIn:        'Early Check-in',
      lateCheckOut:        'Late Check-out',
      dedicatedConcierge:  'Dedicated Concierge',
      zamzamWaterDelivery: 'Zamzam Water',
      haramViewPriority:   'Haram View Priority',
      haramShuttleService: 'Haram Shuttle',
      groupBookingDiscount:'Group Discount',
      pilgrimLoungeAccess: 'Pilgrim Lounge',
      privatePrayerRoom:   'Private Prayer Room',
      hajjGroupCoordinator:'Hajj Coordinator',
    },
  },

  'en-GB': {
    badge: 'Direct Partner',
    badgeTitle: 'UTUBooking Direct Partner',
    badgeDesc: 'Exclusive rates & perks when you book direct through UTUBooking',
    tier: { platinum: 'Platinum Partner', gold: 'Gold Partner', silver: 'Silver Partner', bronze: 'Bronze Partner' },
    distanceHaram: '{m}m from Al-Haram',
    freeCancellation: 'Free Cancellation',
    perNight: '/ night',
    book: 'Book Now',
    perks: {
      earlyCheckIn:        'Early Check-in',
      lateCheckOut:        'Late Check-out',
      dedicatedConcierge:  'Dedicated Concierge',
      zamzamWaterDelivery: 'Zamzam Water',
      haramViewPriority:   'Haram View Priority',
      haramShuttleService: 'Haram Shuttle',
      groupBookingDiscount:'Group Discount',
      pilgrimLoungeAccess: 'Pilgrim Lounge',
      privatePrayerRoom:   'Private Prayer Room',
      hajjGroupCoordinator:'Hajj Coordinator',
    },
  },

  'en-US': {
    badge: 'Direct Partner',
    badgeTitle: 'UTUBooking Direct Partner',
    badgeDesc: 'Exclusive rates & perks when you book direct through UTUBooking',
    tier: { platinum: 'Platinum Partner', gold: 'Gold Partner', silver: 'Silver Partner', bronze: 'Bronze Partner' },
    distanceHaram: '{m}m from Al-Haram',
    freeCancellation: 'Free Cancellation',
    perNight: '/ night',
    book: 'Book Now',
    perks: {
      earlyCheckIn:        'Early Check-in',
      lateCheckOut:        'Late Check-out',
      dedicatedConcierge:  'Dedicated Concierge',
      zamzamWaterDelivery: 'Zamzam Water',
      haramViewPriority:   'Haram View Priority',
      haramShuttleService: 'Haram Shuttle',
      groupBookingDiscount:'Group Discount',
      pilgrimLoungeAccess: 'Pilgrim Lounge',
      privatePrayerRoom:   'Private Prayer Room',
      hajjGroupCoordinator:'Hajj Coordinator',
    },
  },

  'ar': {
    badge: 'شريك مباشر',
    badgeTitle: 'شريك UTUBooking المباشر',
    badgeDesc: 'أسعار وامتيازات حصرية عند الحجز المباشر عبر UTUBooking',
    tier: { platinum: 'شريك بلاتيني', gold: 'شريك ذهبي', silver: 'شريك فضي', bronze: 'شريك برونزي' },
    distanceHaram: '{m} متر من الحرم',
    freeCancellation: 'إلغاء مجاني',
    perNight: '/ ليلة',
    book: 'احجز الآن',
    perks: {
      earlyCheckIn:        'تسجيل وصول مبكر',
      lateCheckOut:        'تسجيل مغادرة متأخر',
      dedicatedConcierge:  'خدمة كونسيرج مخصصة',
      zamzamWaterDelivery: 'ماء زمزم',
      haramViewPriority:   'أولوية الإطلالة على الحرم',
      haramShuttleService: 'خدمة التوصيل للحرم',
      groupBookingDiscount:'خصم حجز المجموعات',
      pilgrimLoungeAccess: 'صالة الحجاج',
      privatePrayerRoom:   'غرفة صلاة خاصة',
      hajjGroupCoordinator:'منسق رحلات الحج',
    },
  },

  'fr': {
    badge: 'Partenaire Direct',
    badgeTitle: 'Partenaire Direct UTUBooking',
    badgeDesc: 'Tarifs et avantages exclusifs en réservant directement via UTUBooking',
    tier: { platinum: 'Partenaire Platine', gold: 'Partenaire Or', silver: 'Partenaire Argent', bronze: 'Partenaire Bronze' },
    distanceHaram: '{m}m du Al-Haram',
    freeCancellation: 'Annulation gratuite',
    perNight: '/ nuit',
    book: 'Réserver',
    perks: {
      earlyCheckIn:        'Arrivée anticipée',
      lateCheckOut:        'Départ tardif',
      dedicatedConcierge:  'Concierge dédié',
      zamzamWaterDelivery: 'Eau Zamzam',
      haramViewPriority:   'Vue prioritaire Al-Haram',
      haramShuttleService: 'Navette Al-Haram',
      groupBookingDiscount:'Remise groupe',
      pilgrimLoungeAccess: 'Salon pèlerin',
      privatePrayerRoom:   'Salle de prière privée',
      hajjGroupCoordinator:'Coordinateur Hajj',
    },
  },

  'tr': {
    badge: 'Doğrudan Ortak',
    badgeTitle: 'UTUBooking Doğrudan Ortağı',
    badgeDesc: 'UTUBooking üzerinden doğrudan rezervasyon yaparak özel fiyat ve ayrıcalıklardan yararlanın',
    tier: { platinum: 'Platin Ortak', gold: 'Altın Ortak', silver: 'Gümüş Ortak', bronze: 'Bronz Ortak' },
    distanceHaram: 'Harem\'e {m}m',
    freeCancellation: 'Ücretsiz İptal',
    perNight: '/ gece',
    book: 'Şimdi Rezervasyon Yap',
    perks: {
      earlyCheckIn:        'Erken Giriş',
      lateCheckOut:        'Geç Çıkış',
      dedicatedConcierge:  'Özel Konsiyerj',
      zamzamWaterDelivery: 'Zemzem Suyu',
      haramViewPriority:   'Harem Manzarası Önceliği',
      haramShuttleService: 'Harem Servisi',
      groupBookingDiscount:'Grup İndirimi',
      pilgrimLoungeAccess: 'Hac Salonu',
      privatePrayerRoom:   'Özel Namaz Odası',
      hajjGroupCoordinator:'Hac Koordinatörü',
    },
  },

  'id': {
    badge: 'Mitra Langsung',
    badgeTitle: 'Mitra Langsung UTUBooking',
    badgeDesc: 'Harga & keuntungan eksklusif saat memesan langsung melalui UTUBooking',
    tier: { platinum: 'Mitra Platinum', gold: 'Mitra Gold', silver: 'Mitra Silver', bronze: 'Mitra Bronze' },
    distanceHaram: '{m}m dari Al-Haram',
    freeCancellation: 'Pembatalan Gratis',
    perNight: '/ malam',
    book: 'Pesan Sekarang',
    perks: {
      earlyCheckIn:        'Check-in Lebih Awal',
      lateCheckOut:        'Check-out Lebih Lambat',
      dedicatedConcierge:  'Concierge Khusus',
      zamzamWaterDelivery: 'Air Zamzam',
      haramViewPriority:   'Prioritas Pemandangan Haram',
      haramShuttleService: 'Shuttle Al-Haram',
      groupBookingDiscount:'Diskon Grup',
      pilgrimLoungeAccess: 'Lounge Jamaah',
      privatePrayerRoom:   'Ruang Sholat Pribadi',
      hajjGroupCoordinator:'Koordinator Haji',
    },
  },

  'ms': {
    badge: 'Rakan Kongsi Langsung',
    badgeTitle: 'Rakan Kongsi Langsung UTUBooking',
    badgeDesc: 'Kadar & keistimewaan eksklusif apabila menempah terus melalui UTUBooking',
    tier: { platinum: 'Rakan Platinum', gold: 'Rakan Emas', silver: 'Rakan Perak', bronze: 'Rakan Gangsa' },
    distanceHaram: '{m}m dari Al-Haram',
    freeCancellation: 'Pembatalan Percuma',
    perNight: '/ malam',
    book: 'Tempah Sekarang',
    perks: {
      earlyCheckIn:        'Daftar Masuk Awal',
      lateCheckOut:        'Daftar Keluar Lewat',
      dedicatedConcierge:  'Concierge Khusus',
      zamzamWaterDelivery: 'Air Zamzam',
      haramViewPriority:   'Keutamaan Pemandangan Haram',
      haramShuttleService: 'Bas Ulang-alik Al-Haram',
      groupBookingDiscount:'Diskaun Kumpulan',
      pilgrimLoungeAccess: 'Lounge Jemaah',
      privatePrayerRoom:   'Bilik Sembahyang Peribadi',
      hajjGroupCoordinator:'Penyelaras Haji',
    },
  },

  'ur': {
    badge: 'براہ راست پارٹنر',
    badgeTitle: 'UTUBooking کا براہ راست پارٹنر',
    badgeDesc: 'UTUBooking کے ذریعے براہ راست بکنگ پر خصوصی نرخ اور مراعات',
    tier: { platinum: 'پلاٹینم پارٹنر', gold: 'گولڈ پارٹنر', silver: 'سلور پارٹنر', bronze: 'برونز پارٹنر' },
    distanceHaram: 'حرم سے {m} میٹر',
    freeCancellation: 'مفت منسوخی',
    perNight: '/ رات',
    book: 'ابھی بک کریں',
    perks: {
      earlyCheckIn:        'جلد چیک ان',
      lateCheckOut:        'دیر سے چیک آؤٹ',
      dedicatedConcierge:  'مخصوص کنسیرج',
      zamzamWaterDelivery: 'آب زمزم',
      haramViewPriority:   'حرم منظر ترجیح',
      haramShuttleService: 'حرم شٹل',
      groupBookingDiscount:'گروپ ڈسکاؤنٹ',
      pilgrimLoungeAccess: 'حاجی لاؤنج',
      privatePrayerRoom:   'نجی نماز کمرہ',
      hajjGroupCoordinator:'حج کوآرڈینیٹر',
    },
  },

  'hi': {
    badge: 'डायरेक्ट पार्टनर',
    badgeTitle: 'UTUBooking डायरेक्ट पार्टनर',
    badgeDesc: 'UTUBooking के ज़रिए सीधे बुकिंग पर एक्सक्लूसिव रेट और सुविधाएँ',
    tier: { platinum: 'प्लैटिनम पार्टनर', gold: 'गोल्ड पार्टनर', silver: 'सिल्वर पार्टनर', bronze: 'ब्रॉन्ज़ पार्टनर' },
    distanceHaram: 'अल-हरम से {m}मी',
    freeCancellation: 'मुफ़्त रद्दीकरण',
    perNight: '/ रात',
    book: 'अभी बुक करें',
    perks: {
      earlyCheckIn:        'जल्दी चेक-इन',
      lateCheckOut:        'देर से चेक-आउट',
      dedicatedConcierge:  'समर्पित कंसीयर्ज',
      zamzamWaterDelivery: 'ज़मज़म पानी',
      haramViewPriority:   'हरम व्यू प्राथमिकता',
      haramShuttleService: 'हरम शटल',
      groupBookingDiscount:'ग्रुप डिस्काउंट',
      pilgrimLoungeAccess: 'हज लाउंज',
      privatePrayerRoom:   'निजी नमाज़ कक्ष',
      hajjGroupCoordinator:'हज समन्वयक',
    },
  },

  'fa': {
    badge: 'شریک مستقیم',
    badgeTitle: 'شریک مستقیم UTUBooking',
    badgeDesc: 'نرخ‌ها و امتیازات انحصاری هنگام رزرو مستقیم از طریق UTUBooking',
    tier: { platinum: 'شریک پلاتینیوم', gold: 'شریک طلایی', silver: 'شریک نقره‌ای', bronze: 'شریک برنزی' },
    distanceHaram: '{m} متر از حرم',
    freeCancellation: 'لغو رایگان',
    perNight: '/ شب',
    book: 'همین الان رزرو کنید',
    perks: {
      earlyCheckIn:        'ورود زودهنگام',
      lateCheckOut:        'خروج دیرهنگام',
      dedicatedConcierge:  'کنسیرج اختصاصی',
      zamzamWaterDelivery: 'آب زمزم',
      haramViewPriority:   'اولویت منظره حرم',
      haramShuttleService: 'سرویس ایاب و ذهاب حرم',
      groupBookingDiscount:'تخفیف گروهی',
      pilgrimLoungeAccess: 'سالن حجاج',
      privatePrayerRoom:   'اتاق نماز خصوصی',
      hajjGroupCoordinator:'هماهنگ‌کننده حج',
    },
  },

  'de': {
    badge: 'Direktpartner',
    badgeTitle: 'UTUBooking Direktpartner',
    badgeDesc: 'Exklusive Tarife & Vorteile bei Direktbuchung über UTUBooking',
    tier: { platinum: 'Platin-Partner', gold: 'Gold-Partner', silver: 'Silber-Partner', bronze: 'Bronze-Partner' },
    distanceHaram: '{m}m vom Al-Haram',
    freeCancellation: 'Kostenlose Stornierung',
    perNight: '/ Nacht',
    book: 'Jetzt buchen',
    perks: {
      earlyCheckIn:        'Frühes Einchecken',
      lateCheckOut:        'Spätes Auschecken',
      dedicatedConcierge:  'Persönlicher Concierge',
      zamzamWaterDelivery: 'Zamzam-Wasser',
      haramViewPriority:   'Haram-Aussicht Priorität',
      haramShuttleService: 'Haram-Shuttle',
      groupBookingDiscount:'Gruppenrabatt',
      pilgrimLoungeAccess: 'Pilger-Lounge',
      privatePrayerRoom:   'Privater Gebetsraum',
      hajjGroupCoordinator:'Hadsch-Koordinator',
    },
  },

  'it': {
    badge: 'Partner Diretto',
    badgeTitle: 'Partner Diretto UTUBooking',
    badgeDesc: 'Tariffe e vantaggi esclusivi prenotando direttamente tramite UTUBooking',
    tier: { platinum: 'Partner Platinum', gold: 'Partner Gold', silver: 'Partner Silver', bronze: 'Partner Bronze' },
    distanceHaram: '{m}m dall\'Al-Haram',
    freeCancellation: 'Cancellazione gratuita',
    perNight: '/ notte',
    book: 'Prenota ora',
    perks: {
      earlyCheckIn:        'Check-in anticipato',
      lateCheckOut:        'Check-out posticipato',
      dedicatedConcierge:  'Concierge dedicato',
      zamzamWaterDelivery: 'Acqua Zamzam',
      haramViewPriority:   'Vista Al-Haram prioritaria',
      haramShuttleService: 'Navetta Al-Haram',
      groupBookingDiscount:'Sconto gruppo',
      pilgrimLoungeAccess: 'Lounge pellegrini',
      privatePrayerRoom:   'Sala preghiera privata',
      hajjGroupCoordinator:'Coordinatore Hajj',
    },
  },

  'nl': {
    badge: 'Directe Partner',
    badgeTitle: 'UTUBooking Directe Partner',
    badgeDesc: 'Exclusieve tarieven & voordelen bij direct boeken via UTUBooking',
    tier: { platinum: 'Platinum Partner', gold: 'Gouden Partner', silver: 'Zilveren Partner', bronze: 'Bronzen Partner' },
    distanceHaram: '{m}m van Al-Haram',
    freeCancellation: 'Gratis annulering',
    perNight: '/ nacht',
    book: 'Nu boeken',
    perks: {
      earlyCheckIn:        'Vroeg inchecken',
      lateCheckOut:        'Laat uitchecken',
      dedicatedConcierge:  'Persoonlijke conciërge',
      zamzamWaterDelivery: 'Zamzam water',
      haramViewPriority:   'Al-Haram uitzicht prioriteit',
      haramShuttleService: 'Al-Haram shuttle',
      groupBookingDiscount:'Groepskorting',
      pilgrimLoungeAccess: 'Pelgrims lounge',
      privatePrayerRoom:   'Privé gebedsruimte',
      hajjGroupCoordinator:'Hajj coördinator',
    },
  },

  'pl': {
    badge: 'Bezpośredni Partner',
    badgeTitle: 'Bezpośredni Partner UTUBooking',
    badgeDesc: 'Ekskluzywne stawki i korzyści przy bezpośredniej rezerwacji przez UTUBooking',
    tier: { platinum: 'Partner Platynowy', gold: 'Partner Złoty', silver: 'Partner Srebrny', bronze: 'Partner Brązowy' },
    distanceHaram: '{m}m od Al-Haram',
    freeCancellation: 'Bezpłatne anulowanie',
    perNight: '/ noc',
    book: 'Zarezerwuj teraz',
    perks: {
      earlyCheckIn:        'Wczesne zameldowanie',
      lateCheckOut:        'Późne wymeldowanie',
      dedicatedConcierge:  'Dedykowany concierge',
      zamzamWaterDelivery: 'Woda Zamzam',
      haramViewPriority:   'Priorytet widoku Al-Haram',
      haramShuttleService: 'Autobus do Al-Haram',
      groupBookingDiscount:'Rabat grupowy',
      pilgrimLoungeAccess: 'Salon pielgrzyma',
      privatePrayerRoom:   'Prywatna sala modlitw',
      hajjGroupCoordinator:'Koordynator Hadżdżu',
    },
  },

  'es': {
    badge: 'Socio Directo',
    badgeTitle: 'Socio Directo UTUBooking',
    badgeDesc: 'Tarifas y ventajas exclusivas al reservar directamente a través de UTUBooking',
    tier: { platinum: 'Socio Platino', gold: 'Socio Oro', silver: 'Socio Plata', bronze: 'Socio Bronce' },
    distanceHaram: '{m}m del Al-Haram',
    freeCancellation: 'Cancelación gratuita',
    perNight: '/ noche',
    book: 'Reservar ahora',
    perks: {
      earlyCheckIn:        'Entrada anticipada',
      lateCheckOut:        'Salida tardía',
      dedicatedConcierge:  'Conserje dedicado',
      zamzamWaterDelivery: 'Agua Zamzam',
      haramViewPriority:   'Prioridad vista Al-Haram',
      haramShuttleService: 'Traslado Al-Haram',
      groupBookingDiscount:'Descuento grupo',
      pilgrimLoungeAccess: 'Sala peregrinos',
      privatePrayerRoom:   'Sala de oración privada',
      hajjGroupCoordinator:'Coordinador Hajj',
    },
  },

  'es-419': {
    badge: 'Socio Directo',
    badgeTitle: 'Socio Directo UTUBooking',
    badgeDesc: 'Tarifas y ventajas exclusivas al reservar directamente a través de UTUBooking',
    tier: { platinum: 'Socio Platino', gold: 'Socio Oro', silver: 'Socio Plata', bronze: 'Socio Bronce' },
    distanceHaram: '{m}m del Al-Haram',
    freeCancellation: 'Cancelación gratuita',
    perNight: '/ noche',
    book: 'Reservar ahora',
    perks: {
      earlyCheckIn:        'Entrada anticipada',
      lateCheckOut:        'Salida tardía',
      dedicatedConcierge:  'Conserje dedicado',
      zamzamWaterDelivery: 'Agua Zamzam',
      haramViewPriority:   'Prioridad vista Al-Haram',
      haramShuttleService: 'Traslado Al-Haram',
      groupBookingDiscount:'Descuento grupo',
      pilgrimLoungeAccess: 'Sala peregrinos',
      privatePrayerRoom:   'Sala de oración privada',
      hajjGroupCoordinator:'Coordinador Hajj',
    },
  },

  'pt-BR': {
    badge: 'Parceiro Direto',
    badgeTitle: 'Parceiro Direto UTUBooking',
    badgeDesc: 'Tarifas e vantagens exclusivas ao reservar diretamente pelo UTUBooking',
    tier: { platinum: 'Parceiro Platina', gold: 'Parceiro Ouro', silver: 'Parceiro Prata', bronze: 'Parceiro Bronze' },
    distanceHaram: '{m}m do Al-Haram',
    freeCancellation: 'Cancelamento grátis',
    perNight: '/ noite',
    book: 'Reservar agora',
    perks: {
      earlyCheckIn:        'Check-in antecipado',
      lateCheckOut:        'Check-out tardio',
      dedicatedConcierge:  'Concierge dedicado',
      zamzamWaterDelivery: 'Água Zamzam',
      haramViewPriority:   'Vista prioritária do Haram',
      haramShuttleService: 'Traslado Al-Haram',
      groupBookingDiscount:'Desconto em grupo',
      pilgrimLoungeAccess: 'Lounge do peregrino',
      privatePrayerRoom:   'Sala de oração privativa',
      hajjGroupCoordinator:'Coordenador de Hajj',
    },
  },
};

// ─── Inject into each locale file ─────────────────────────────────────────────

const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
let updated = 0;
let skipped = 0;

for (const file of files) {
  const locale = file.replace('.json', '');
  const filePath = path.join(LOCALES_DIR, file);

  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (json.partner) {
    console.log(`  SKIP  ${file} (already has "partner" key)`);
    skipped++;
    continue;
  }

  // Use locale-specific translation, fall back to English
  const translation = PARTNER_TRANSLATIONS[locale] || PARTNER_TRANSLATIONS['en'];
  json.partner = translation;

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`  OK    ${file}`);
  updated++;
}

console.log(`\nDone — ${updated} updated, ${skipped} skipped.`);
