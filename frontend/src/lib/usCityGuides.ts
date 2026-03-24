/**
 * US Muslim City Guide — Static Data
 *
 * Hardcoded reference data for 6 US cities with significant Muslim communities.
 * Used by /us/muslim-guide/[city] static pages.
 * This data changes at most annually — no DB or API needed.
 *
 * Note: Content reviewed for accuracy at time of writing (2026).
 * Marketing team to review + update annually with community advisors.
 */

export interface Mosque {
  name:     string;
  address:  string;
  mapsUrl:  string;
}

export interface IslamicService {
  category: string;
  items:    string[];
}

export interface CityGuide {
  slug:               string;
  name:               string;
  state:              string;
  centerLat:          number;
  centerLng:          number;
  muslimPopEstimate:  string;
  departureAirport:   string;
  airportName:        string;
  tagline:            string;
  heroDescription:    string;
  mosques:            Mosque[];
  islamicServices:    IslamicService[];
}

export const CITY_GUIDES: Record<string, CityGuide> = {
  dearborn: {
    slug:              'dearborn',
    name:              'Dearborn',
    state:             'Michigan',
    centerLat:         42.3223,
    centerLng:         -83.1763,
    muslimPopEstimate: '~40,000 (30% of city)',
    departureAirport:  'DTW',
    airportName:       'Detroit Metropolitan Wayne County Airport',
    tagline:           'The Heart of Arab America',
    heroDescription:
      'Dearborn, Michigan is home to one of the largest Arab and Muslim communities in the United States. With over 40,000 Muslim residents, world-class halal dining, and direct connections to Detroit Metro Airport for Umrah travel, Dearborn is the premier US departure hub for the Muslim traveler.',
    mosques: [
      {
        name:    'The Islamic Center of America',
        address: '19500 Ford Rd, Dearborn, MI 48128',
        mapsUrl: 'https://maps.google.com/?q=Islamic+Center+of+America+Dearborn',
      },
      {
        name:    'The American Moslem Society (Dix Mosque)',
        address: '9945 W Vernor Hwy, Dearborn, MI 48120',
        mapsUrl: 'https://maps.google.com/?q=American+Moslem+Society+Dearborn',
      },
      {
        name:    'Bint Jebail Cultural Center',
        address: '12300 W Warren Ave, Dearborn, MI 48126',
        mapsUrl: 'https://maps.google.com/?q=Bint+Jebail+Cultural+Center+Dearborn',
      },
    ],
    islamicServices: [
      {
        category: 'Halal Grocery',
        items: ['Saad Supermarket', 'International Market', 'La Pita Restaurant & Grocery'],
      },
      {
        category: 'Islamic Finance',
        items: ['University Bank (Sharia-compliant mortgages)', 'Midwest Amanah'],
      },
      {
        category: 'Islamic Education',
        items: ['University of Michigan–Dearborn Muslim Students Association', 'ACCESS Arab American Community Center'],
      },
    ],
  },

  'new-york': {
    slug:              'new-york',
    name:              'New York City',
    state:             'New York',
    centerLat:         40.7128,
    centerLng:         -74.0060,
    muslimPopEstimate: '~800,000',
    departureAirport:  'JFK',
    airportName:       'John F. Kennedy International Airport',
    tagline:           'A Global Muslim Metropolis',
    heroDescription:
      'New York City is home to the largest Muslim population of any US city — over 800,000 across all five boroughs. From Jackson Heights to Bay Ridge, NYC\'s Muslim communities represent over 100 nationalities. JFK Airport offers the most daily non-stop flights to Jeddah and Madinah of any US gateway.',
    mosques: [
      {
        name:    'Islamic Cultural Center of New York',
        address: '1711 3rd Ave, New York, NY 10029',
        mapsUrl: 'https://maps.google.com/?q=Islamic+Cultural+Center+New+York',
      },
      {
        name:    'Masjid Malcolm Shabazz',
        address: '102 W 116th St, New York, NY 10026',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Malcolm+Shabazz+New+York',
      },
      {
        name:    'Dar Al-Hijrah Mosque — Queens',
        address: '88-41 Parsons Blvd, Jamaica, NY 11432',
        mapsUrl: 'https://maps.google.com/?q=Dar+Al-Hijrah+Mosque+Queens',
      },
    ],
    islamicServices: [
      {
        category: 'Halal Grocery',
        items: ['Alif Grocery (Brooklyn)', 'Al Falah Supermarket (Astoria)', 'Kalustyan\'s (Manhattan)'],
      },
      {
        category: 'Islamic Education',
        items: ['Islamic School of Queens', 'Tarbiyah Islamic School (Brooklyn)'],
      },
      {
        category: 'Community Organizations',
        items: ['Islamic Circle of North America (ICNA)', 'Muslim Community Network NYC'],
      },
    ],
  },

  chicago: {
    slug:              'chicago',
    name:              'Chicago',
    state:             'Illinois',
    centerLat:         41.8781,
    centerLng:         -87.6298,
    muslimPopEstimate: '~400,000',
    departureAirport:  'ORD',
    airportName:       "O'Hare International Airport",
    tagline:           'ISNA\'s Hometown',
    heroDescription:
      'Chicago is the headquarters of the Islamic Society of North America (ISNA) and home to a thriving Muslim community across diverse neighborhoods. O\'Hare is a major hub for connecting flights to Jeddah. The Chicago area hosts some of the most active Umrah group programs in the country through ISNA.',
    mosques: [
      {
        name:    'Mosque Foundation (Bridgeview)',
        address: '7360 W 93rd St, Bridgeview, IL 60455',
        mapsUrl: 'https://maps.google.com/?q=Mosque+Foundation+Bridgeview+Illinois',
      },
      {
        name:    'Islamic Foundation Village (Villa Park)',
        address: '300 W Highridge Rd, Villa Park, IL 60181',
        mapsUrl: 'https://maps.google.com/?q=Islamic+Foundation+Villa+Park',
      },
      {
        name:    'Dar Al Taqwa',
        address: '6309 N Pulaski Rd, Chicago, IL 60646',
        mapsUrl: 'https://maps.google.com/?q=Dar+Al+Taqwa+Chicago',
      },
    ],
    islamicServices: [
      {
        category: 'Islamic Organizations',
        items: ['Islamic Society of North America (ISNA)', 'Council of Islamic Organizations of Greater Chicago (CIOGC)'],
      },
      {
        category: 'Halal Grocery',
        items: ['Devon Avenue (Chicago\'s "Little India/Pakistan")', 'Halal Depot', 'International Grocery'],
      },
      {
        category: 'Islamic Finance',
        items: ['Guidance Residential (Sharia-compliant home financing)', 'Devon Bank Islamic Finance'],
      },
    ],
  },

  'los-angeles': {
    slug:              'los-angeles',
    name:              'Los Angeles',
    state:             'California',
    centerLat:         34.0522,
    centerLng:         -118.2437,
    muslimPopEstimate: '~500,000',
    departureAirport:  'LAX',
    airportName:       'Los Angeles International Airport',
    tagline:           'The West Coast Muslim Hub',
    heroDescription:
      'Los Angeles is home to California\'s largest Muslim community — over 500,000 across the greater metro area. LAX has direct flights to Dubai (connecting to Jeddah/Madinah via Emirates and flydubai) and is a key gateway for West Coast Muslim travelers. The Iranian, Moroccan, Pakistani, and Indonesian communities all have strong presences in LA.',
    mosques: [
      {
        name:    'King Fahad Mosque',
        address: '10980 Blanche Ave, Los Angeles, CA 90064',
        mapsUrl: 'https://maps.google.com/?q=King+Fahad+Mosque+Los+Angeles',
      },
      {
        name:    'Islamic Center of Southern California',
        address: '434 S Vermont Ave, Los Angeles, CA 90020',
        mapsUrl: 'https://maps.google.com/?q=Islamic+Center+Southern+California',
      },
      {
        name:    'Masjid Omar Ibn Al-Khattab',
        address: '1025 Exposition Blvd, Los Angeles, CA 90007',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Omar+Ibn+Al-Khattab+Los+Angeles',
      },
    ],
    islamicServices: [
      {
        category: 'Halal Grocery',
        items: ['Wholesome Choice (Anaheim)', 'Caravan Market', 'Al-Noor Halal Market'],
      },
      {
        category: 'Islamic Education',
        items: ['New Horizon School', 'Southern California Islamic Center School'],
      },
      {
        category: 'Community Organizations',
        items: ['Muslim Public Affairs Council (MPAC)', 'Islamic Shura Council of Southern California'],
      },
    ],
  },

  houston: {
    slug:              'houston',
    name:              'Houston',
    state:             'Texas',
    centerLat:         29.7604,
    centerLng:         -95.3698,
    muslimPopEstimate: '~200,000',
    departureAirport:  'IAH',
    airportName:       'George Bush Intercontinental Airport',
    tagline:           'The South\'s Muslim Heartland',
    heroDescription:
      'Houston has one of the fastest-growing Muslim populations in the US — driven by its large South Asian, Arab, and Nigerian communities. Bush Intercontinental Airport connects to Jeddah via Qatar Airways (via Doha) and Turkish Airlines (via Istanbul), making it an efficient Umrah gateway for the South.',
    mosques: [
      {
        name:    'Masjid Al-Islam Houston',
        address: '7401 Culberson Ave, Houston, TX 77051',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Al-Islam+Houston',
      },
      {
        name:    'Islamic Society of Greater Houston (ISGH)',
        address: '3110 Eastside St, Houston, TX 77098',
        mapsUrl: 'https://maps.google.com/?q=Islamic+Society+Greater+Houston',
      },
      {
        name:    'Masjid Al-Noor',
        address: '11808 Bissonnet St, Houston, TX 77099',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Al-Noor+Houston',
      },
    ],
    islamicServices: [
      {
        category: 'Halal Grocery',
        items: ['Indo-Pak Halal Store', 'Phoenicia Specialty Foods', 'Zabihah Halal Superstore'],
      },
      {
        category: 'Islamic Education',
        items: ['Clear Lake Islamic Center School', 'ISGH Schools'],
      },
      {
        category: 'Community Organizations',
        items: ['Islamic Society of Greater Houston (ISGH)', 'Council on American-Islamic Relations Texas (CAIR-TX)'],
      },
    ],
  },

  detroit: {
    slug:              'detroit',
    name:              'Detroit',
    state:             'Michigan',
    centerLat:         42.3314,
    centerLng:         -83.0458,
    muslimPopEstimate: '~250,000 (metro area)',
    departureAirport:  'DTW',
    airportName:       'Detroit Metropolitan Wayne County Airport',
    tagline:           'Gateway to Umrah from the Midwest',
    heroDescription:
      'Detroit\'s greater metro area — anchored by Dearborn — has the highest concentration of Arab Americans and Muslims anywhere in the United States. DTW offers convenient Umrah departures and the region hosts dozens of active Umrah group programs through local Islamic centers.',
    mosques: [
      {
        name:    'Islamic Center of Detroit',
        address: '17554 Woodward Ave, Detroit, MI 48203',
        mapsUrl: 'https://maps.google.com/?q=Islamic+Center+of+Detroit',
      },
      {
        name:    'Masjid Wali Muhammad',
        address: '11529 Linwood Ave, Detroit, MI 48206',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Wali+Muhammad+Detroit',
      },
      {
        name:    'Islamic House of Wisdom (Dearborn Heights)',
        address: '22575 Ann Arbor Trail, Dearborn Heights, MI 48127',
        mapsUrl: 'https://maps.google.com/?q=Islamic+House+of+Wisdom+Dearborn+Heights',
      },
    ],
    islamicServices: [
      {
        category: 'Halal Grocery',
        items: ['Saad Supermarket', 'Hamido\'s Fresh Produce', 'International Market on Michigan Ave'],
      },
      {
        category: 'Community Organizations',
        items: ['Arab Community Center for Economic and Social Services (ACCESS)', 'American Muslim Society'],
      },
      {
        category: 'Umrah Groups',
        items: ['Islamic Center of America Umrah Program', 'American Muslim Society Group Tours'],
      },
    ],
  },
};

export const CITY_SLUGS = Object.keys(CITY_GUIDES);

export function getCityGuide(slug: string): CityGuide | null {
  return CITY_GUIDES[slug] ?? null;
}
