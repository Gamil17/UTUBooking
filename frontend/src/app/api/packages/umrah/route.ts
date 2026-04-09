/**
 * GET /api/packages/umrah
 * Assembles Umrah package options (flight + hotel) for a US departure city.
 *
 * Query params:
 *   origin      — IATA code (JFK, LAX, ORD, IAD, IAH, DTW)
 *   checkIn     — ISO date string (YYYY-MM-DD)
 *   checkOut    — ISO date string
 *   adults      — number of travelers (default 1)
 *   tier        — 'economy' | 'standard' | 'premium' (default 'standard')
 *
 * Response: { packages: UmrahPackage[] }
 *
 * This route queries the flight and hotel search services in parallel,
 * then pairs the cheapest eligible flight with matching hotel offers
 * by tier to produce combined packages.
 */

import { NextRequest, NextResponse } from 'next/server';

const HOTEL_SERVICE  = process.env.INTERNAL_HOTEL_SERVICE_URL  ?? 'http://localhost:3003';
const FLIGHT_SERVICE = process.env.INTERNAL_FLIGHT_SERVICE_URL ?? 'http://localhost:3004';

// Star rating bands per tier
const TIER_STARS: Record<string, number[]> = {
  economy:  [3],
  standard: [4],
  premium:  [5],
};

// Connection hubs per US origin (mirrors amadeus-airlines.json usSpecialFilters)
const CONNECTION_HUBS: Record<string, string[]> = {
  JFK: ['DOH', 'LHR', 'AUH', 'DXB'],
  DTW: ['DOH', 'DXB', 'AUH', 'IST'],
  ORD: ['LHR', 'IST', 'DOH', 'DXB'],
  LAX: ['AUH', 'DXB', 'DOH', 'LHR'],
  IAD: ['IST', 'AUH', 'DOH', 'LHR'],
  IAH: ['AUH', 'DXB', 'DOH'],
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin   = searchParams.get('origin')?.toUpperCase() ?? '';
  const checkIn  = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';
  const adults   = parseInt(searchParams.get('adults') ?? '1', 10);
  const tier     = (searchParams.get('tier') ?? 'standard') as keyof typeof TIER_STARS;

  if (!origin || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'origin, checkIn, and checkOut are required' },
      { status: 400 },
    );
  }

  if (!CONNECTION_HUBS[origin]) {
    return NextResponse.json(
      { error: `Unsupported US origin: ${origin}. Supported: ${Object.keys(CONNECTION_HUBS).join(', ')}` },
      { status: 400 },
    );
  }

  // Nights calculation
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
  );

  if (nights < 5 || nights > 30) {
    return NextResponse.json(
      { error: 'Trip length must be 5–30 nights for Umrah packages' },
      { status: 400 },
    );
  }

  // ── Fetch flights + hotels in parallel ──────────────────────────────────────
  const [flightRes, hotelRes] = await Promise.allSettled([
    fetch(
      `${FLIGHT_SERVICE}/api/v1/flights/search?origin=${origin}&destination=JED` +
      `&date=${checkIn}&adults=${adults}&returnDate=${checkOut}&tripType=umrah`,
      { signal: AbortSignal.timeout(15000) },
    ),
    fetch(
      `${HOTEL_SERVICE}/api/v1/hotels/search?location=Makkah&checkIn=${checkIn}` +
      `&checkOut=${checkOut}&guests=${adults}&halal_friendly=true`,
      { signal: AbortSignal.timeout(15000) },
    ),
  ]);

  const flights = flightRes.status === 'fulfilled' && flightRes.value.ok
    ? (await flightRes.value.json()).results ?? []
    : [];

  const hotels = hotelRes.status === 'fulfilled' && hotelRes.value.ok
    ? (await hotelRes.value.json()).results ?? []
    : [];

  // ── Build packages ────────────────────────────────────────────────────────────
  const starFilter = TIER_STARS[tier] ?? TIER_STARS.standard;
  const eligibleHotels = hotels
    .filter((h: { starRating?: number }) => starFilter.includes(h.starRating ?? 0))
    .slice(0, 5);

  // Use cheapest outbound flight as the base flight
  const sortedFlights = [...flights].sort(
    (a: { price?: number }, b: { price?: number }) => (a.price ?? 0) - (b.price ?? 0),
  );
  const baseFlightPrice  = sortedFlights[0]?.price ?? 0;
  const baseFlightInfo   = sortedFlights[0] ?? null;

  // If no live data, fall back to static estimated packages
  if (eligibleHotels.length === 0 || !baseFlightInfo) {
    const staticPackages = buildStaticPackages(origin, checkIn, checkOut, nights, adults, tier);
    return NextResponse.json({ packages: staticPackages, source: 'static' });
  }

  const packages = eligibleHotels.map((hotel: {
    id?: string; name?: string; starRating?: number;
    price?: number; distanceFromHaram?: number; isHalalFriendly?: boolean;
    thumbnail?: string;
  }) => {
    const hotelNightlyRate = hotel.price ?? 0;
    const hotelTotal       = hotelNightlyRate * nights;
    const flightTotal      = baseFlightPrice * adults;           // round-trip per person × adults
    const totalPrice       = flightTotal + hotelTotal;
    const pricePerPerson   = Math.round(totalPrice / adults);

    return {
      id:          `${origin}-JED-${hotel.id}-${tier}`,
      origin,
      destination: 'JED',
      tier,
      nights,
      adults,
      checkIn,
      checkOut,
      pricePerPerson,
      totalPrice,
      flight: {
        outbound:    baseFlightInfo,
        connectionNote: `Via ${CONNECTION_HUBS[origin][0]} — typical journey 16–22 hrs`,
      },
      hotel: {
        id:              hotel.id,
        name:            hotel.name,
        starRating:      hotel.starRating,
        pricePerNight:   hotelNightlyRate,
        distanceFromHaram: hotel.distanceFromHaram,
        isHalalFriendly:   hotel.isHalalFriendly,
        thumbnail:       hotel.thumbnail,
      },
      includes: ['Round-trip flight', `${nights}-night hotel stay`, 'Halal-friendly hotel'],
    };
  });

  return NextResponse.json({ packages, source: 'live' });
}

// ── Static fallback packages (shown when live APIs are unavailable) ─────────────
function buildStaticPackages(
  origin: string,
  checkIn: string,
  checkOut: string,
  nights: number,
  adults: number,
  tier: string,
) {
  // Estimated price ranges per tier (USD, per person, round-trip flight + hotel)
  const BASE_PRICES: Record<string, number> = {
    economy:  1800,
    standard: 2600,
    premium:  4500,
  };

  const SAMPLE_HOTELS: Record<string, { name: string; stars: number; distM: number }[]> = {
    economy: [
      { name: 'Al Kiswah Towers Hotel', stars: 3, distM: 600 },
      { name: 'Zam Zam Pullman Hotel', stars: 3, distM: 800 },
    ],
    standard: [
      { name: 'Hilton Suites Makkah', stars: 4, distM: 350 },
      { name: 'Swissôtel Al Maqam Makkah', stars: 4, distM: 200 },
    ],
    premium: [
      { name: 'Raffles Makkah Palace', stars: 5, distM: 50 },
      { name: 'Conrad Makkah', stars: 5, distM: 150 },
    ],
  };

  const hotels = SAMPLE_HOTELS[tier] ?? SAMPLE_HOTELS.standard;
  const basePrice = BASE_PRICES[tier] ?? BASE_PRICES.standard;

  return hotels.map((hotel, i) => ({
    id:          `static-${origin}-${tier}-${i}`,
    origin,
    destination: 'JED',
    tier,
    nights,
    adults,
    checkIn,
    checkOut,
    pricePerPerson: basePrice + (i * 200),
    totalPrice:     (basePrice + (i * 200)) * adults,
    flight: {
      outbound:    null,
      connectionNote: `Via ${(CONNECTION_HUBS[origin] ?? ['DOH'])[0]} — typical journey 16–22 hrs`,
    },
    hotel: {
      id:              `static-hotel-${i}`,
      name:            hotel.name,
      starRating:      hotel.stars,
      pricePerNight:   null,
      distanceFromHaram: hotel.distM,
      isHalalFriendly:   true,
      thumbnail:       null,
    },
    includes:  ['Round-trip flight', `${nights}-night hotel stay`, 'Halal-friendly hotel'],
    isEstimate: true,
  }));
}
