/**
 * Migration 031 — Add halal_amenities + is_halal_friendly to hotel_offers
 *
 * Supports the Halal Hotel Filter feature (Phase 10 — US Muslim traveler features).
 * halal_amenities: JSONB storing individual facility flags from provider data.
 * is_halal_friendly: indexed boolean for fast filtered queries (true when
 *   halal_food OR prayer_room is present in halal_amenities).
 *
 * Run on ALL shard DBs:
 *   bash backend/scripts/migrate-all-shards.sh MIGRATION=20260324000031
 */

exports.up = (pgm) => {
  pgm.addColumn('hotel_offers', {
    halal_amenities: {
      type:    'jsonb',
      notNull: false,
      default: null,
      comment: 'Halal facility flags: { no_alcohol, halal_food, prayer_room, qibla_direction, zamzam_water, female_only_floor, no_pork }',
    },
    is_halal_friendly: {
      type:    'boolean',
      notNull: true,
      default: false,
      comment: 'True when halal_amenities contains halal_food:true or prayer_room:true',
    },
  });

  pgm.addIndex('hotel_offers', 'is_halal_friendly', {
    name:    'idx_hotel_offers_halal',
    where:   'is_halal_friendly = TRUE',
    comment: 'Partial index for halal_friendly=true filter — only indexes ~10% of rows',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('hotel_offers', 'is_halal_friendly', { name: 'idx_hotel_offers_halal', ifExists: true });
  pgm.dropColumn('hotel_offers', 'is_halal_friendly', { ifExists: true });
  pgm.dropColumn('hotel_offers', 'halal_amenities',   { ifExists: true });
};
