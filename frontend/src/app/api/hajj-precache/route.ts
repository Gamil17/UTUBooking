import { NextResponse } from 'next/server';

/**
 * GET /api/hajj-precache
 *
 * Returns top 50 Makkah + Madinah hotel results for service worker pre-caching.
 * Only active when NEXT_PUBLIC_HAJJ_MODE=true.
 * The SW fetches this during the `install` event and stores it in 'hajj-hotels-cache'.
 */
export async function GET() {
  if (process.env.NEXT_PUBLIC_HAJJ_MODE !== 'true') {
    return NextResponse.json({ message: 'Hajj mode is not active' }, { status: 404 });
  }

  const hotelServiceUrl =
    process.env.INTERNAL_HOTEL_SERVICE_URL ?? 'http://localhost:3003';

  const today = getIsoDate(1);
  const weekOut = getIsoDate(8);

  const makkahParams = new URLSearchParams({
    location: 'MCM',
    checkIn:  today,
    checkOut: weekOut,
    guests:   '2',
    limit:    '25',
    isHajj:   'true',
  });

  const madinahParams = new URLSearchParams({
    location: 'MED',
    checkIn:  today,
    checkOut: weekOut,
    guests:   '2',
    limit:    '25',
    isHajj:   'true',
  });

  try {
    const [makkahRes, madinahRes] = await Promise.all([
      fetch(`${hotelServiceUrl}/api/v1/hotels/search?${makkahParams}`, {
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${hotelServiceUrl}/api/v1/hotels/search?${madinahParams}`, {
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    const makkah = makkahRes.ok ? ((await makkahRes.json()).results ?? []) : [];
    const madinah = madinahRes.ok ? ((await madinahRes.json()).results ?? []) : [];

    // Don't cache empty results — return 503 so the service worker retries later
    if (makkah.length === 0 && madinah.length === 0) {
      console.error('[hajj-precache] both hotel fetches returned empty results');
      return NextResponse.json({ error: 'Hotel data unavailable' }, { status: 503 });
    }

    return NextResponse.json(
      {
        makkah:   makkah.slice(0, 25),
        madinah:  madinah.slice(0, 25),
        cachedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=21600, s-maxage=21600', // 6 hours
        },
      }
    );
  } catch (err) {
    console.error('[hajj-precache] fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch Hajj hotels' }, { status: 500 });
  }
}

function getIsoDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}
