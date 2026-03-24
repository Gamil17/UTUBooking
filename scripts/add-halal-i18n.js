/* eslint-disable */
/**
 * Adds halal + cityGuide i18n sections to all non-English locale files.
 * Run: node scripts/add-halal-i18n.js
 */

const fs   = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'frontend', 'locales');

const ADDITIONS = {
  ar: {
    halal: {
      badge: 'ملائم للحلال', no_alcohol: 'خالٍ من الكحول', halal_food: 'طعام حلال',
      prayer_room: 'غرفة للصلاة', qibla_direction: 'اتجاه القبلة', zamzam_water: 'ماء زمزم',
      female_only_floor: 'طابق للنساء فقط', no_pork: 'خالٍ من لحم الخنزير'
    },
    cityGuide: {
      pageTitle: 'دليل المسلم إلى {city}', muslimPop: 'عدد المسلمين',
      halalDining: 'مطاعم حلال قريبة', mosques: 'المساجد',
      departureAirport: 'أقرب مطار للسفر إلى العمرة', islamicServices: 'الخدمات الإسلامية',
      searchFlights: 'ابحث عن رحلات من {airport}', loadingRestaurants: 'جارٍ البحث عن مطاعم حلال...',
      noRestaurants: 'لا توجد مطاعم حلال قريبة.', retryBtn: 'حاول مجدداً'
    }
  },
  fr: {
    halal: {
      badge: 'Halal-Friendly', no_alcohol: 'Sans alcool', halal_food: 'Nourriture halal',
      prayer_room: 'Salle de prière', qibla_direction: 'Direction de la Qibla',
      zamzam_water: 'Eau de Zamzam', female_only_floor: 'Étage réservé aux femmes', no_pork: 'Sans porc'
    },
    cityGuide: {
      pageTitle: 'Guide musulman de {city}', muslimPop: 'Population musulmane',
      halalDining: 'Restaurants halal à proximité', mosques: 'Mosquées',
      departureAirport: 'Aéroport de départ Omra le plus proche', islamicServices: 'Services islamiques',
      searchFlights: 'Rechercher des vols depuis {airport}', loadingRestaurants: 'Recherche de restaurants halal…',
      noRestaurants: 'Aucun restaurant halal trouvé à proximité.', retryBtn: 'Réessayer'
    }
  },
  tr: {
    halal: {
      badge: 'Helal Dostu', no_alcohol: 'Alkol Yok', halal_food: 'Helal Yemek',
      prayer_room: 'Namaz Odası', qibla_direction: 'Kıble Yönü', zamzam_water: 'Zemzem Suyu',
      female_only_floor: 'Sadece Kadınlar Katı', no_pork: 'Domuz Eti Yok'
    },
    cityGuide: {
      pageTitle: '{city} Müslüman Rehberi', muslimPop: 'Müslüman Nüfusu',
      halalDining: 'Yakınlardaki Helal Restoranlar', mosques: 'Camiler',
      departureAirport: 'En Yakın Umre Kalkış Havalimanı', islamicServices: 'İslami Hizmetler',
      searchFlights: '{airport} Çıkışlı Uçuş Ara', loadingRestaurants: 'Helal restoranlar aranıyor…',
      noRestaurants: 'Yakında helal restoran bulunamadı.', retryBtn: 'Tekrar Dene'
    }
  },
  id: {
    halal: {
      badge: 'Ramah Halal', no_alcohol: 'Bebas Alkohol', halal_food: 'Makanan Halal',
      prayer_room: 'Ruang Sholat', qibla_direction: 'Arah Kiblat', zamzam_water: 'Air Zamzam',
      female_only_floor: 'Lantai Khusus Wanita', no_pork: 'Bebas Babi'
    },
    cityGuide: {
      pageTitle: 'Panduan Muslim di {city}', muslimPop: 'Populasi Muslim',
      halalDining: 'Restoran Halal Terdekat', mosques: 'Masjid',
      departureAirport: 'Bandara Keberangkatan Umroh Terdekat', islamicServices: 'Layanan Islam',
      searchFlights: 'Cari Penerbangan dari {airport}', loadingRestaurants: 'Mencari restoran halal…',
      noRestaurants: 'Tidak ada restoran halal di sekitar.', retryBtn: 'Coba Lagi'
    }
  },
  ms: {
    halal: {
      badge: 'Mesra Halal', no_alcohol: 'Bebas Alkohol', halal_food: 'Makanan Halal',
      prayer_room: 'Bilik Solat', qibla_direction: 'Arah Kiblat', zamzam_water: 'Air Zamzam',
      female_only_floor: 'Tingkat Wanita Sahaja', no_pork: 'Bebas Babi'
    },
    cityGuide: {
      pageTitle: 'Panduan Muslim di {city}', muslimPop: 'Penduduk Muslim',
      halalDining: 'Restoran Halal Berdekatan', mosques: 'Masjid',
      departureAirport: 'Lapangan Terbang Berlepas Umrah Terdekat', islamicServices: 'Perkhidmatan Islam',
      searchFlights: 'Cari Penerbangan dari {airport}', loadingRestaurants: 'Mencari restoran halal…',
      noRestaurants: 'Tiada restoran halal berdekatan.', retryBtn: 'Cuba Lagi'
    }
  },
  ur: {
    halal: {
      badge: 'حلال دوست', no_alcohol: 'شراب سے پاک', halal_food: 'حلال کھانا',
      prayer_room: 'نماز کا کمرہ', qibla_direction: 'قبلہ کی سمت', zamzam_water: 'زمزم کا پانی',
      female_only_floor: 'خواتین کی منزل', no_pork: 'سور سے پاک'
    },
    cityGuide: {
      pageTitle: '{city} کے لیے مسلم گائیڈ', muslimPop: 'مسلم آبادی',
      halalDining: 'قریب حلال ریستوران', mosques: 'مساجد',
      departureAirport: 'قریب ترین عمرہ روانگی ایئرپورٹ', islamicServices: 'اسلامی خدمات',
      searchFlights: '{airport} سے پروازیں تلاش کریں', loadingRestaurants: 'حلال ریستوران تلاش ہو رہے ہیں…',
      noRestaurants: 'قریب کوئی حلال ریستوران نہیں ملا۔', retryBtn: 'دوبارہ کوشش کریں'
    }
  },
  hi: {
    halal: {
      badge: 'हलाल-अनुकूल', no_alcohol: 'शराब-मुक्त', halal_food: 'हलाल भोजन',
      prayer_room: 'नमाज़ कक्ष', qibla_direction: 'क़िब्ला दिशा', zamzam_water: 'ज़मज़म जल',
      female_only_floor: 'महिला-केवल मंज़िल', no_pork: 'सूअर-मुक्त'
    },
    cityGuide: {
      pageTitle: '{city} के लिए मुस्लिम गाइड', muslimPop: 'मुस्लिम जनसंख्या',
      halalDining: 'पास में हलाल रेस्तरां', mosques: 'मस्जिदें',
      departureAirport: 'निकटतम उमरा प्रस्थान हवाई अड्डा', islamicServices: 'इस्लामिक सेवाएँ',
      searchFlights: '{airport} से उड़ान खोजें', loadingRestaurants: 'हलाल रेस्तरां ढूंढे जा रहे हैं…',
      noRestaurants: 'पास में कोई हलाल रेस्तरां नहीं मिला।', retryBtn: 'पुनः प्रयास करें'
    }
  },
  fa: {
    halal: {
      badge: 'حلال‌پسند', no_alcohol: 'بدون الکل', halal_food: 'غذای حلال',
      prayer_room: 'اتاق نماز', qibla_direction: 'جهت قبله', zamzam_water: 'آب زمزم',
      female_only_floor: 'طبقه ویژه بانوان', no_pork: 'بدون گوشت خوک'
    },
    cityGuide: {
      pageTitle: 'راهنمای مسلمانان در {city}', muslimPop: 'جمعیت مسلمان',
      halalDining: 'رستوران‌های حلال نزدیک', mosques: 'مساجد',
      departureAirport: 'نزدیک‌ترین فرودگاه عزیمت عمره', islamicServices: 'خدمات اسلامی',
      searchFlights: 'جستجوی پرواز از {airport}', loadingRestaurants: 'در حال جستجوی رستوران‌های حلال…',
      noRestaurants: 'رستوران حلالی در نزدیکی یافت نشد.', retryBtn: 'تلاش مجدد'
    }
  },
  de: {
    halal: {
      badge: 'Halal-freundlich', no_alcohol: 'Alkoholfrei', halal_food: 'Halal-Essen',
      prayer_room: 'Gebetsraum', qibla_direction: 'Qibla-Richtung', zamzam_water: 'Zamzam-Wasser',
      female_only_floor: 'Etage nur für Frauen', no_pork: 'Schweinefleischfrei'
    },
    cityGuide: {
      pageTitle: 'Muslim-Reiseführer für {city}', muslimPop: 'Muslimische Bevölkerung',
      halalDining: 'Halal-Restaurants in der Nähe', mosques: 'Moscheen',
      departureAirport: 'Nächster Umra-Abflughafen', islamicServices: 'Islamische Dienste',
      searchFlights: 'Flüge ab {airport} suchen', loadingRestaurants: 'Halal-Restaurants werden gesucht…',
      noRestaurants: 'Keine Halal-Restaurants in der Nähe gefunden.', retryBtn: 'Erneut versuchen'
    }
  },
  'en-GB': {
    halal: {
      badge: 'Halal-Friendly', no_alcohol: 'Alcohol-Free', halal_food: 'Halal Food',
      prayer_room: 'Prayer Room', qibla_direction: 'Qibla Direction', zamzam_water: 'Zamzam Water',
      female_only_floor: 'Female-Only Floor', no_pork: 'Pork-Free'
    },
    cityGuide: {
      pageTitle: 'Muslim Guide to {city}', muslimPop: 'Muslim Population',
      halalDining: 'Halal Dining Nearby', mosques: 'Mosques',
      departureAirport: 'Nearest Umrah Departure Airport', islamicServices: 'Islamic Services',
      searchFlights: 'Search Flights from {airport}', loadingRestaurants: 'Finding halal restaurants…',
      noRestaurants: 'No halal restaurants found nearby.', retryBtn: 'Try Again'
    }
  },
  it: {
    halal: {
      badge: 'Halal-Friendly', no_alcohol: 'Senza alcol', halal_food: 'Cibo halal',
      prayer_room: 'Sala preghiera', qibla_direction: 'Direzione Qibla', zamzam_water: 'Acqua Zamzam',
      female_only_floor: 'Piano solo donne', no_pork: 'Senza maiale'
    },
    cityGuide: {
      pageTitle: 'Guida musulmana di {city}', muslimPop: 'Popolazione musulmana',
      halalDining: 'Ristoranti halal nelle vicinanze', mosques: 'Moschee',
      departureAirport: 'Aeroporto di partenza Umrah più vicino', islamicServices: 'Servizi islamici',
      searchFlights: 'Cerca voli da {airport}', loadingRestaurants: 'Ricerca ristoranti halal…',
      noRestaurants: 'Nessun ristorante halal trovato nelle vicinanze.', retryBtn: 'Riprova'
    }
  },
  nl: {
    halal: {
      badge: 'Halal-vriendelijk', no_alcohol: 'Alcoholvrij', halal_food: 'Halal voedsel',
      prayer_room: 'Gebedsruimte', qibla_direction: 'Qibla-richting', zamzam_water: 'Zamzam-water',
      female_only_floor: 'Verdieping alleen voor vrouwen', no_pork: 'Varkensvrij'
    },
    cityGuide: {
      pageTitle: 'Moslimgids voor {city}', muslimPop: 'Moslimbevolking',
      halalDining: 'Halal restaurants in de buurt', mosques: 'Moskeeën',
      departureAirport: 'Dichtstbijzijnde Umrah-vertrekhaven', islamicServices: 'Islamitische diensten',
      searchFlights: 'Zoek vluchten vanuit {airport}', loadingRestaurants: 'Halal restaurants zoeken…',
      noRestaurants: 'Geen halal restaurants gevonden in de buurt.', retryBtn: 'Opnieuw proberen'
    }
  },
  pl: {
    halal: {
      badge: 'Przyjazny halal', no_alcohol: 'Bezalkoholowy', halal_food: 'Jedzenie halal',
      prayer_room: 'Sala modlitwy', qibla_direction: 'Kierunek Qibla', zamzam_water: 'Woda Zamzam',
      female_only_floor: 'Piętro tylko dla kobiet', no_pork: 'Bez wieprzowiny'
    },
    cityGuide: {
      pageTitle: 'Przewodnik muzułmański po {city}', muslimPop: 'Populacja muzułmańska',
      halalDining: 'Restauracje halal w pobliżu', mosques: 'Meczety',
      departureAirport: 'Najbliższe lotnisko odlotów na Umrę', islamicServices: 'Usługi islamskie',
      searchFlights: 'Szukaj lotów z {airport}', loadingRestaurants: 'Szukam restauracji halal…',
      noRestaurants: 'Nie znaleziono restauracji halal w pobliżu.', retryBtn: 'Spróbuj ponownie'
    }
  },
  es: {
    halal: {
      badge: 'Apto para halal', no_alcohol: 'Sin alcohol', halal_food: 'Comida halal',
      prayer_room: 'Sala de oración', qibla_direction: 'Dirección Qibla', zamzam_water: 'Agua Zamzam',
      female_only_floor: 'Planta solo para mujeres', no_pork: 'Sin cerdo'
    },
    cityGuide: {
      pageTitle: 'Guía musulmana de {city}', muslimPop: 'Población musulmana',
      halalDining: 'Restaurantes halal cercanos', mosques: 'Mezquitas',
      departureAirport: 'Aeropuerto de salida Umra más cercano', islamicServices: 'Servicios islámicos',
      searchFlights: 'Buscar vuelos desde {airport}', loadingRestaurants: 'Buscando restaurantes halal…',
      noRestaurants: 'No se encontraron restaurantes halal cercanos.', retryBtn: 'Intentar de nuevo'
    }
  },
  'pt-BR': {
    halal: {
      badge: 'Apto para halal', no_alcohol: 'Sem álcool', halal_food: 'Comida halal',
      prayer_room: 'Sala de oração', qibla_direction: 'Direção da Qibla', zamzam_water: 'Água Zamzam',
      female_only_floor: 'Andar exclusivo para mulheres', no_pork: 'Sem porco'
    },
    cityGuide: {
      pageTitle: 'Guia muçulmano de {city}', muslimPop: 'População muçulmana',
      halalDining: 'Restaurantes halal próximos', mosques: 'Mesquitas',
      departureAirport: 'Aeroporto de partida Umra mais próximo', islamicServices: 'Serviços islâmicos',
      searchFlights: 'Buscar voos de {airport}', loadingRestaurants: 'Procurando restaurantes halal…',
      noRestaurants: 'Nenhum restaurante halal encontrado próximo.', retryBtn: 'Tentar novamente'
    }
  },
  'es-419': {
    halal: {
      badge: 'Apto para halal', no_alcohol: 'Sin alcohol', halal_food: 'Comida halal',
      prayer_room: 'Sala de oración', qibla_direction: 'Dirección Qibla', zamzam_water: 'Agua Zamzam',
      female_only_floor: 'Piso solo para mujeres', no_pork: 'Sin cerdo'
    },
    cityGuide: {
      pageTitle: 'Guía musulmana de {city}', muslimPop: 'Población musulmana',
      halalDining: 'Restaurantes halal cercanos', mosques: 'Mezquitas',
      departureAirport: 'Aeropuerto de salida Umra más cercano', islamicServices: 'Servicios islámicos',
      searchFlights: 'Buscar vuelos desde {airport}', loadingRestaurants: 'Buscando restaurantes halal…',
      noRestaurants: 'No se encontraron restaurantes halal cercanos.', retryBtn: 'Intentar de nuevo'
    }
  }
};

for (const [locale, sections] of Object.entries(ADDITIONS)) {
  const filePath = path.join(LOCALES_DIR, locale + '.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.assign(data, sections);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log('Updated:', locale + '.json');
}
console.log('All done.');
