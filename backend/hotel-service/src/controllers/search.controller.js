const { validate }                             = require('../validators/search.validator');
const { searchHotels, HotelbedsError }         = require('../../../adapters/hotelbeds');
const bookingCom                               = require('../../../adapters/hotels/bookingCom');
const { searchLocalHotels }                    = require('../db/hotel.repo');
// Redis caching is handled inside each adapter (5/10-min TTL respectively)

// ─── Price deduplication ──────────────────────────────────────────────────────
/**
 * Deduplicates hotels that appear in BOTH Hotelbeds and Booking.com results.
 *
 * Match criteria (first that fires wins):
 *   1. Geo-proximity: both hotels within 100 m of each other
 *   2. Normalised name + city match (case-insensitive, punctuation stripped)
 *
 * When a duplicate is found:
 *   - Keep the offer with the LOWER totalPrice
 *   - Both sources are listed in the kept offer's `sources` array for transparency
 *
 * @param {HotelOffer[]} hbOffers   Hotelbeds results
 * @param {HotelOffer[]} bcOffers   Booking.com results
 * @returns {HotelOffer[]}          Merged + deduplicated list
 */
function _deduplicateOffers(hbOffers, bcOffers) {
  if (!bcOffers.length) return hbOffers.map((o) => ({ ...o, sources: ['hotelbeds'] }));
  if (!hbOffers.length) return bcOffers.map((o) => ({ ...o, sources: ['bookingcom'] }));

  // Build geo-index from Booking.com offers for fast proximity lookup
  const bcWithCoords = bcOffers.filter((o) => o.latitude && o.longitude);

  function _haversineM(lat1, lon1, lat2, lon2) {
    const R    = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return Math.round(2 * 6371000 * Math.asin(Math.sqrt(a)));
  }

  function _normalizeName(name) {
    return (name?.en ?? name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const matched = new Set(); // indices of bcOffers that have been matched
  const result  = [];

  for (const hb of hbOffers) {
    let matchedBc = null;

    // 1. Geo-proximity match (100 m radius)
    if (hb.latitude && hb.longitude) {
      for (let i = 0; i < bcWithCoords.length; i++) {
        if (matched.has(i)) continue;
        const bc = bcWithCoords[i];
        const distM = _haversineM(hb.latitude, hb.longitude, bc.latitude, bc.longitude);
        if (distM <= 100) {
          matchedBc = { offer: bc, idx: bcOffers.indexOf(bc) };
          break;
        }
      }
    }

    // 2. Fallback: normalised name + city match
    if (!matchedBc) {
      const hbName = _normalizeName(hb.name);
      const hbCity = (hb.city ?? '').toLowerCase().trim();
      for (let i = 0; i < bcOffers.length; i++) {
        if (matched.has(i)) continue;
        const bc = bcOffers[i];
        const bcName = _normalizeName(bc.name);
        const bcCity = (bc.city ?? '').toLowerCase().trim();
        if (hbName && bcName && hbName === bcName && hbCity === bcCity) {
          matchedBc = { offer: bc, idx: i };
          break;
        }
      }
    }

    if (matchedBc) {
      // Duplicate found — keep the cheaper offer
      matched.add(matchedBc.idx);
      const cheaper = hb.totalPrice <= matchedBc.offer.totalPrice ? hb : matchedBc.offer;
      const pricier  = hb.totalPrice <= matchedBc.offer.totalPrice ? matchedBc.offer : hb;
      result.push({
        ...cheaper,
        sources:         ['hotelbeds', 'bookingcom'],
        altPrice:        pricier.totalPrice,       // expose the other price for transparency
        altSource:       pricier.source,
        priceIsDedupMin: true,
      });
    } else {
      // No match — include as-is from Hotelbeds
      result.push({ ...hb, sources: ['hotelbeds'] });
    }
  }

  // Append unmatched Booking.com results
  for (let i = 0; i < bcOffers.length; i++) {
    if (!matched.has(i)) {
      result.push({ ...bcOffers[i], sources: ['bookingcom'] });
    }
  }

  return result;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function searchHotelsHandler(req, res, next) {
  // 1. Validate input
  const { error, value: params } = validate(req.query);
  if (error) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      details: error.details.map((d) => d.message),
    });
  }

  // 2. Cross-validate dates
  if (new Date(params.checkOut) <= new Date(params.checkIn)) {
    return res.status(400).json({
      error: 'INVALID_DATES',
      message: 'checkOut must be after checkIn',
    });
  }

  const searchOpts = {
    stars:         params.stars,
    priceMin:      params.priceMin,
    priceMax:      params.priceMax,
    currency:      params.currency,
    isHajj:        params.isHajj,
    isUmrah:       params.isUmrah,
    halalFriendly: params.halal_friendly,
  };

  // 3. Fan out to both adapters concurrently
  //    Booking.com only active when BOOKINGCOM_USERNAME is configured.
  const useBookingCom = !!(process.env.BOOKINGCOM_USERNAME && process.env.BOOKINGCOM_PASSWORD);

  const [hbResult, bcResult] = await Promise.allSettled([
    searchHotels(params.location, params.checkIn, params.checkOut, params.guests, searchOpts),
    useBookingCom
      ? bookingCom.searchHotels(params.location, params.checkIn, params.checkOut, params.guests, searchOpts)
      : Promise.resolve([]),
  ]);

  // 4. Tolerate partial failures — log but don't block
  if (hbResult.status === 'rejected') {
    console.error('[search] Hotelbeds error:', hbResult.reason?.message);
  }
  if (bcResult.status === 'rejected') {
    console.error('[search] Booking.com error:', bcResult.reason?.message);
  }

  const hbOffers = hbResult.status  === 'fulfilled' ? hbResult.value  : [];
  const bcOffers = bcResult.status  === 'fulfilled' ? bcResult.value  : [];

  // 5. Both failed → fall back to local DB (dev mode / no API keys)
  if (!hbOffers.length && !bcOffers.length && hbResult.status === 'rejected') {
    try {
      const localOffers = await searchLocalHotels(
        params.location, params.checkIn, params.checkOut, params.guests,
        { stars: params.stars, priceMin: params.priceMin, priceMax: params.priceMax,
          currency: params.currency, isHajj: params.isHajj, isUmrah: params.isUmrah,
          halalFriendly: params.halal_friendly }
      );
      const page  = params.page  ?? 1;
      const limit = params.limit ?? 20;
      const start = (page - 1) * limit;
      return res.json({
        source:  'local',
        count:   localOffers.length,
        page, limit,
        results: localOffers.slice(start, start + limit),
        meta:    { hotelbeds: 0, bookingcom: 0, deduped: 0, localFallback: true },
      });
    } catch (dbErr) {
      console.error('[search] local DB fallback failed:', dbErr.message);
      return next(hbResult.reason);
    }
  }

  // 6. Dedup and merge
  let results = _deduplicateOffers(hbOffers, bcOffers);

  // 6b. Apply halal filter (post-dedup — works regardless of which adapter returned the data)
  const preDedupCount = results.length;
  if (params.halal_friendly) {
    results = results.filter((r) => r.isHalalFriendly === true);
  }
  const halalFiltered = preDedupCount - results.length;

  // 7. Apply pagination
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return res.json({
    source: useBookingCom ? 'multi' : 'live',
    count:  results.length,
    page,
    limit,
    results: paged,
    meta: {
      hotelbeds:     hbOffers.length,
      bookingcom:    bcOffers.length,
      deduped:       hbOffers.length + bcOffers.length - preDedupCount,
      halalFiltered: params.halal_friendly ? halalFiltered : undefined,
    },
  });
}

module.exports = { searchHotelsHandler };
