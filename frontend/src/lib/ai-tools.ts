import type Anthropic from '@anthropic-ai/sdk';

// ─── Tool Definitions (schemas passed to Claude) ──────────────────────────────

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_hotels',
    description:
      'Search for hotels near the Grand Mosque (Haram) in Makkah or Madinah. ' +
      'Returns a list of available hotels with prices in SAR, star ratings, and distance from the Haram. ' +
      'Always call this tool when the user asks about hotels, accommodation, or places to stay.',
    input_schema: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'City name, e.g. "Makkah", "Madinah", "Jeddah"',
        },
        checkIn: {
          type: 'string',
          description: 'Check-in date in YYYY-MM-DD format',
        },
        checkOut: {
          type: 'string',
          description: 'Check-out date in YYYY-MM-DD format',
        },
        guests: {
          type: 'integer',
          description: 'Number of guests (adults)',
          minimum: 1,
          maximum: 20,
        },
        maxPricePerNight: {
          type: 'integer',
          description: 'Optional maximum price per night in SAR',
        },
      },
      required: ['destination', 'checkIn', 'checkOut', 'guests'],
    },
  },
  {
    name: 'search_flights',
    description:
      'Search for flights. Use IATA airport codes: JED = Jeddah King Abdulaziz, MED = Madinah, MCM = Makkah area. ' +
      'Returns available flights with prices in SAR. ' +
      'Call this when the user asks about flights, travel, or getting to Saudi Arabia.',
    input_schema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Departure airport IATA code, e.g. "RUH", "DXB", "LHR"',
        },
        to: {
          type: 'string',
          description: 'Arrival airport IATA code, e.g. "JED", "MED"',
        },
        departDate: {
          type: 'string',
          description: 'Departure date in YYYY-MM-DD format',
        },
        returnDate: {
          type: 'string',
          description: 'Return date in YYYY-MM-DD format (optional for one-way)',
        },
        passengers: {
          type: 'integer',
          description: 'Number of passengers',
          minimum: 1,
          maximum: 20,
        },
      },
      required: ['from', 'to', 'departDate', 'passengers'],
    },
  },
  {
    name: 'plan_trip',
    description:
      'Plan a complete Umrah or Hajj trip package including hotel and flight options. ' +
      'Call this when the user wants help planning a full trip, package deal, or asks for Umrah/Hajj planning.',
    input_schema: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'Primary destination, e.g. "Makkah", "Madinah"',
        },
        nights: {
          type: 'integer',
          description: 'Number of nights to stay',
          minimum: 1,
        },
        guests: {
          type: 'integer',
          description: 'Number of travellers',
          minimum: 1,
        },
        departureCity: {
          type: 'string',
          description: 'City or airport the traveller is departing from, e.g. "Dubai", "London", "RUH"',
        },
        month: {
          type: 'string',
          description: 'Preferred travel month, e.g. "March 2026", "Ramadan 2026"',
        },
      },
      required: ['destination', 'nights', 'guests', 'departureCity', 'month'],
    },
  },
];

// ─── Tool Executor Types ───────────────────────────────────────────────────────

interface HotelResult {
  name: string;
  pricePerNight: number;
  distanceHaramM: number;
  starRating: number;
  freeCancellation: boolean;
}

interface FlightResult {
  airlineCode: string;
  flightNum: string;
  price: number;
  durationMinutes: number;
  stops: number;
}

// ─── Tool Executors ───────────────────────────────────────────────────────────

const HOTEL_SERVICE  = process.env.INTERNAL_HOTEL_SERVICE_URL  ?? 'http://hotel-service:3003';
const FLIGHT_SERVICE = process.env.INTERNAL_FLIGHT_SERVICE_URL ?? 'http://flight-service:3004';

async function searchHotels(input: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  maxPricePerNight?: number;
}): Promise<string> {
  try {
    const params = new URLSearchParams({
      location: input.destination,  // hotel-service expects "location"
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: String(input.guests),
      ...(input.maxPricePerNight ? { priceMax: String(input.maxPricePerNight) } : {}),
    });

    const res = await fetch(
      `${HOTEL_SERVICE}/api/v1/hotels/search?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) throw new Error(`Hotels API ${res.status}`);
    const data = await res.json() as { results: HotelResult[] };
    const hotels = data.results ?? [];

    if (hotels.length === 0) {
      return 'No hotels found matching your criteria. Try adjusting dates or budget.';
    }

    const lines = hotels.slice(0, 6).map(h =>
      `• ${h.name} — SAR ${h.pricePerNight}/night | ${h.distanceHaramM}m from Haram | ${'★'.repeat(h.starRating)} | ${h.freeCancellation ? 'Free cancellation' : 'Non-refundable'}`
    );
    return `Found ${hotels.length} hotels in ${input.destination}:\n${lines.join('\n')}`;
  } catch {
    // Fallback stub data so the widget works even before the hotels microservice is live
    return stubHotels(input.destination, input.maxPricePerNight);
  }
}

function stubHotels(destination: string, maxPrice?: number): string {
  const hotels: HotelResult[] = [
    { name: 'Swissotel Makkah', pricePerNight: 1380, distanceHaramM: 100, starRating: 5, freeCancellation: true },
    { name: 'Pullman ZamZam Makkah', pricePerNight: 1127, distanceHaramM: 200, starRating: 5, freeCancellation: true },
    { name: 'Hilton Suites Makkah', pricePerNight: 863, distanceHaramM: 350, starRating: 5, freeCancellation: false },
    { name: 'Al Safwah Royale Orchid', pricePerNight: 713, distanceHaramM: 500, starRating: 4, freeCancellation: true },
    { name: 'Makkah Hotel & Towers', pricePerNight: 480, distanceHaramM: 800, starRating: 4, freeCancellation: false },
    { name: 'Dar Al Tawhid Intercontinental', pricePerNight: 390, distanceHaramM: 1200, starRating: 3, freeCancellation: true },
  ];
  const filtered = maxPrice ? hotels.filter(h => h.pricePerNight <= maxPrice) : hotels;
  if (filtered.length === 0) return `No hotels found in ${destination} under SAR ${maxPrice}/night.`;
  const lines = filtered.slice(0, 5).map(h =>
    `• ${h.name} — SAR ${h.pricePerNight}/night | ${h.distanceHaramM}m from Haram | ${'★'.repeat(h.starRating)} | ${h.freeCancellation ? 'Free cancellation' : 'Non-refundable'}`
  );
  return `Found ${filtered.length} hotels in ${destination}:\n${lines.join('\n')}`;
}

async function searchFlights(input: {
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  passengers: number;
}): Promise<string> {
  try {
    const params = new URLSearchParams({
      origin: input.from,           // flight-service expects "origin"
      destination: input.to,        // and "destination"
      date: input.departDate,       // and "date"
      adults: String(input.passengers),  // and "adults"
      ...(input.returnDate ? { returnDate: input.returnDate } : {}),
    });

    const res = await fetch(
      `${FLIGHT_SERVICE}/api/v1/flights/search?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) throw new Error(`Flights API ${res.status}`);
    const data = await res.json() as { results: FlightResult[] };
    const flights = data.results ?? [];

    if (flights.length === 0) return 'No flights found for those dates.';

    const lines = flights.slice(0, 4).map(f => {
      const h = Math.floor(f.durationMinutes / 60);
      const m = f.durationMinutes % 60;
      return `• ${f.airlineCode} ${f.flightNum} — SAR ${f.price} | ${h}h ${m}m | ${f.stops === 0 ? 'Direct' : `${f.stops} stop(s)`}`;
    });
    return `Found ${flights.length} flights from ${input.from} to ${input.to} on ${input.departDate}:\n${lines.join('\n')}`;
  } catch {
    return stubFlights(input.from, input.to, input.departDate);
  }
}

function stubFlights(from: string, to: string, departDate: string): string {
  const flights: FlightResult[] = [
    { airlineCode: 'Saudia', flightNum: 'SV 802', price: 1450, durationMinutes: 135, stops: 0 },
    { airlineCode: 'flyadeal', flightNum: 'F3 411', price: 890, durationMinutes: 150, stops: 0 },
    { airlineCode: 'Emirates', flightNum: 'EK 803', price: 2100, durationMinutes: 250, stops: 1 },
    { airlineCode: 'Air Arabia', flightNum: 'G9 311', price: 720, durationMinutes: 165, stops: 0 },
  ];
  const lines = flights.map(f => {
    const h = Math.floor(f.durationMinutes / 60);
    const m = f.durationMinutes % 60;
    return `• ${f.airlineCode} ${f.flightNum} — SAR ${f.price} | ${h}h ${m}m | ${f.stops === 0 ? 'Direct' : `${f.stops} stop(s)`}`;
  });
  return `Available flights from ${from} to ${to} on ${departDate}:\n${lines.join('\n')}`;
}

// Common city → IATA lookup so planTrip produces valid codes
const CITY_IATA: Record<string, string> = {
  dubai: 'DXB', london: 'LHR', paris: 'CDG', istanbul: 'IST',
  cairo: 'CAI', 'kuala lumpur': 'KUL', jakarta: 'CGK', karachi: 'KHI',
  lahore: 'LHE', islamabad: 'ISB', dhaka: 'DAC', delhi: 'DEL',
  mumbai: 'BOM', riyadh: 'RUH', jeddah: 'JED', dammam: 'DMM',
  abu: 'AUH', 'abu dhabi': 'AUH', amman: 'AMM', beirut: 'BEY',
  baghdad: 'BGW', tehran: 'IKA', frankfurt: 'FRA', amsterdam: 'AMS',
  toronto: 'YYZ', 'new york': 'JFK', houston: 'IAH', chicago: 'ORD',
  'kuala': 'KUL', casablanca: 'CMN', tunis: 'TUN', algiers: 'ALG',
};

function cityToIata(city: string): string {
  const key = city.toLowerCase().trim();
  if (CITY_IATA[key]) return CITY_IATA[key];
  // If user typed an IATA code directly (3 letters)
  if (/^[A-Z]{3}$/.test(city.toUpperCase())) return city.toUpperCase();
  // Last-resort: first 3 letters upper-cased (may be wrong but better than crashing)
  return key.slice(0, 3).toUpperCase();
}

function parseTravelMonth(month: string): string {
  const MONTHS: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    ramadan: 3, // approximate — varies by year; good enough for planning purposes
    hajj: 6,   // approximate Dhul Hijjah
    umrah: 3,
  };
  const lower = month.toLowerCase();
  const today = new Date();
  let targetYear = today.getFullYear();
  let targetMonth = today.getMonth() + 2; // next month as fallback

  for (const [name, num] of Object.entries(MONTHS)) {
    if (lower.includes(name)) {
      targetMonth = num;
      // If that month already passed this year, use next year
      const probe = new Date(targetYear, num - 1, 15);
      if (probe < today) targetYear++;
      break;
    }
  }

  // Try to extract a 4-digit year from the string
  const yearMatch = month.match(/\b(202\d|203\d)\b/);
  if (yearMatch) targetYear = parseInt(yearMatch[1], 10);

  const mm = String(targetMonth).padStart(2, '0');
  return `${targetYear}-${mm}-15`;
}

async function planTrip(input: {
  destination: string;
  nights: number;
  guests: number;
  departureCity: string;
  month: string;
}): Promise<string> {
  const checkIn  = parseTravelMonth(input.month);
  const checkOut = new Date(new Date(checkIn).getTime() + input.nights * 86400000)
    .toISOString()
    .slice(0, 10);
  const fromCode = cityToIata(input.departureCity);

  const [hotelResult, flightResult] = await Promise.all([
    searchHotels({ destination: input.destination, checkIn, checkOut, guests: input.guests }),
    searchFlights({ from: fromCode, to: 'JED', departDate: checkIn, passengers: input.guests }),
  ]);

  return (
    `📋 Umrah Package Plan — ${input.destination} | ${input.nights} nights | ${input.guests} guests | ${input.month}\n\n` +
    `✈️ FLIGHTS:\n${flightResult}\n\n` +
    `🏨 HOTELS:\n${hotelResult}\n\n` +
    `💡 Tip: Book early for Ramadan — hotels near Haram sell out 3-4 months in advance.`
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'search_hotels':
      return searchHotels(input as Parameters<typeof searchHotels>[0]);
    case 'search_flights':
      return searchFlights(input as Parameters<typeof searchFlights>[0]);
    case 'plan_trip':
      return planTrip(input as Parameters<typeof planTrip>[0]);
    default:
      return `Unknown tool: ${name}`;
  }
}
