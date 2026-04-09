/* eslint-disable camelcase */
'use strict';

/**
 * Migration: hotel_partnerships
 *
 * Tracks direct hotel partnership contracts. These are properties where AMEC Solutions
 * has negotiated commission rates directly rather than going through Hotelbeds/GDS.
 *
 * When a search result matches a partner hotel (via hotelbeds_hotel_code or name),
 * the partnership.service.js overlays isDirectPartner=true + commissionRate onto
 * the HotelOffer so it can be badged in the UI and routed correctly in finance.
 */
exports.up = (pgm) => {
  pgm.createType('partnership_tier', ['bronze', 'silver', 'gold', 'platinum']);
  pgm.createType('partnership_status', ['active', 'pending', 'suspended', 'expired']);

  pgm.createTable('hotel_partnerships', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // Internal reference, e.g. "PART-2026-MKK-001"
    reference_code: {
      type: 'varchar(30)',
      notNull: true,
      unique: true,
    },
    // Displayed name (English)
    hotel_name_en: {
      type: 'varchar(255)',
      notNull: true,
    },
    hotel_name_ar: {
      type: 'varchar(255)',
    },
    // Hotelbeds hotel code — used to match live search results
    hotelbeds_hotel_code: {
      type: 'varchar(20)',
      notNull: true,
      unique: true,
    },
    // Optional secondary GDS codes for cross-source matching
    amadeus_hotel_code: {
      type: 'varchar(20)',
    },
    booking_com_property_id: {
      type: 'varchar(40)',
    },
    // Location
    city: {
      type: 'varchar(100)',
      notNull: true,
    },
    country_code: {
      type: 'varchar(2)',
      notNull: true,
    },
    // Haversine distance from Al-Masjid Al-Haram in metres (null if not Makkah)
    distance_haram_m: {
      type: 'integer',
    },
    // Stars (1-5)
    stars: {
      type: 'smallint',
    },
    // Commercial terms
    commission_rate: {
      type: 'numeric(5,2)',
      notNull: true,
      comment: 'Percentage commission paid to UTUBooking, e.g. 12.50 = 12.5%',
    },
    tier: {
      type: 'partnership_tier',
      notNull: true,
      default: 'bronze',
    },
    status: {
      type: 'partnership_status',
      notNull: true,
      default: 'active',
    },
    // Contract window
    contract_start: {
      type: 'date',
      notNull: true,
    },
    contract_end: {
      type: 'date',
      notNull: true,
    },
    auto_renew: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    // Contacts
    primary_contact_name: {
      type: 'varchar(150)',
    },
    primary_contact_email: {
      type: 'varchar(255)',
    },
    primary_contact_phone: {
      type: 'varchar(30)',
    },
    // Perks and notes stored as JSONB for flexibility
    // e.g. { "earlyCheckIn": true, "dedicatedConcierge": true, "minNights": 2 }
    partner_perks: {
      type: 'jsonb',
    },
    notes: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.sql(`ALTER TABLE hotel_partnerships ALTER COLUMN partner_perks SET DEFAULT '{}'`);

  // Query indexes
  pgm.createIndex('hotel_partnerships', 'hotelbeds_hotel_code');
  pgm.createIndex('hotel_partnerships', 'country_code');
  pgm.createIndex('hotel_partnerships', 'city');
  pgm.createIndex('hotel_partnerships', 'status');
  pgm.createIndex('hotel_partnerships', ['country_code', 'status']); // "active partners in KSA"
  pgm.createIndex('hotel_partnerships', 'contract_end'); // expiry alerts

  // Seed Phase 2 partners — Makkah flagship properties
  pgm.sql(`
    INSERT INTO hotel_partnerships (
      reference_code, hotel_name_en, hotel_name_ar, hotelbeds_hotel_code,
      city, country_code, distance_haram_m, stars,
      commission_rate, tier, status,
      contract_start, contract_end, auto_renew,
      primary_contact_name, primary_contact_email, primary_contact_phone,
      partner_perks, notes
    ) VALUES
    (
      'PART-2026-MKK-001',
      'Swissotel Makkah',
      'سويس أوتيل مكة',
      'SWISSOTEL_MKK',
      'Makkah', 'SA', 200, 5,
      15.00, 'gold', 'active',
      '2026-03-25', '2027-03-25', true,
      'Ahmed Al-Rashidi', 'ahmed.alrashidi@swissotel-makkah.com', '+966-12-000-0001',
      '{"earlyCheckIn": true, "lateCheckOut": true, "dedicatedConcierge": true, "zamzamWaterDelivery": true, "haramViewPriority": true}'::jsonb,
      'Phase 2 flagship partner. Tower facing Al-Masjid Al-Haram. Commission review at 6-month mark.'
    ),
    (
      'PART-2026-MKK-002',
      'Hilton Makkah Convention Hotel',
      'هيلتون مكة للمؤتمرات',
      'HILTON_MKK',
      'Makkah', 'SA', 350, 5,
      13.50, 'gold', 'active',
      '2026-03-25', '2027-03-25', true,
      'Sara Al-Otaibi', 'sarah.alotaibi@hilton.com', '+966-12-000-0002',
      '{"earlyCheckIn": true, "haramShuttleService": true, "groupBookingDiscount": true, "pilgrimLoungeAccess": true}'::jsonb,
      'Phase 2 flagship partner. Strong group/corporate booking history. Hajj season block allocation to be negotiated Q4 2026.'
    ),
    (
      'PART-2026-MKK-003',
      'Dar Al Tawhid Intercontinental Makkah',
      'دار التوحيد إنتركونتيننتال مكة',
      'DARTAWHID_MKK',
      'Makkah', 'SA', 50, 5,
      14.00, 'platinum', 'active',
      '2026-03-25', '2027-03-25', true,
      'Mohammed Al-Zahrani', 'm.alzahrani@ihg.com', '+966-12-000-0003',
      '{"earlyCheckIn": true, "lateCheckOut": true, "dedicatedConcierge": true, "zamzamWaterDelivery": true, "haramViewPriority": true, "privatePrayerRoom": true, "hajjGroupCoordinator": true}'::jsonb,
      'Phase 2 flagship partner. Closest property to Al-Haram (50m). Platinum tier — highest commission. Priority inventory allocation for Hajj/Umrah season.'
    );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('hotel_partnerships');
  pgm.dropType('partnership_status');
  pgm.dropType('partnership_tier');
};
