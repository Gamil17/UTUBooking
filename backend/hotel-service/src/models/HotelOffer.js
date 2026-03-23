class HotelOffer {
  constructor(data) {
    this.id             = data.id;
    this.hotelbedsCode  = data.hotelbedsCode;
    this.name           = data.name;           // { en: string, ar: string | null }
    this.stars          = data.stars;
    this.distanceHaramM = data.distanceHaramM; // metres from Al-Masjid Al-Haram, or null
    this.address        = data.address;
    this.city           = data.city;
    this.images         = data.images;
    this.amenities      = data.amenities;
    this.pricePerNight  = data.pricePerNight;
    this.totalPrice     = data.totalPrice;
    this.currency       = data.currency;
    this.checkIn        = data.checkIn;
    this.checkOut       = data.checkOut;
    this.nights         = data.nights;
    this.availability   = true;
    this.source         = 'hotelbeds';
  }

  // Transform a single Hotelbeds hotel object into a HotelOffer
  static fromHotelbeds(raw, params) {
    const nights = _nightsBetween(params.checkIn, params.checkOut);
    const minRate = _minRate(raw.minRate, raw.rooms);
    const pricePerNight = parseFloat(minRate) || 0;

    return new HotelOffer({
      id:             String(raw.code),
      hotelbedsCode:  String(raw.code),
      name:           { en: raw.name || '', ar: null },
      stars:          raw.categoryCode ? parseInt(raw.categoryCode, 10) : null,
      distanceHaramM: null, // enriched later from DB if needed
      address:        raw.address ? raw.address.content || '' : '',
      city:           raw.destinationName || params.location,
      images:         _extractImages(raw.images),
      amenities:      _extractFacilities(raw.facilities),
      pricePerNight:  pricePerNight,
      totalPrice:     parseFloat((pricePerNight * nights).toFixed(2)),
      currency:       params.currency || 'SAR',
      checkIn:        params.checkIn,
      checkOut:       params.checkOut,
      nights:         nights,
    });
  }
}

function _nightsBetween(checkIn, checkOut) {
  const msPerDay = 86400000;
  return Math.round((new Date(checkOut) - new Date(checkIn)) / msPerDay);
}

function _minRate(minRate, rooms) {
  if (minRate) return minRate;
  if (!rooms || !rooms.length) return 0;
  const rates = rooms.flatMap((r) => (r.rates || []).map((rt) => parseFloat(rt.net || 0)));
  return rates.length ? Math.min(...rates) : 0;
}

function _extractImages(images) {
  if (!images || !images.length) return [];
  return images
    .slice(0, 5)
    .map((img) => img.path ? `https://photos.hotelbeds.com/giata/bigger/${img.path}` : null)
    .filter(Boolean);
}

function _extractFacilities(facilities) {
  if (!facilities || !facilities.length) return [];
  return facilities
    .slice(0, 10)
    .map((f) => f.facilityName || f.description || '')
    .filter(Boolean);
}

module.exports = HotelOffer;
