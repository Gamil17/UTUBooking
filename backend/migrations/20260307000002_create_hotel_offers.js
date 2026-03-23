/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('hotel_offers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // External reference (e.g. Hotelbeds hotel code)
    hotel_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    name_ar: {
      type: 'varchar(255)',
    },
    stars: {
      type: 'smallint',
      check: 'stars BETWEEN 1 AND 5',
    },
    // City / destination string (e.g. 'Makkah', 'Madinah')
    location: {
      type: 'varchar(255)',
      notNull: true,
    },
    // Distance from Al-Masjid Al-Haram — key differentiator for Hajj/Umrah market
    distance_haram_m: {
      type: 'integer',
    },
    price_per_night: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',
    },
    is_hajj_package: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_umrah_package: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    amenities: {
      type: 'text[]',
    },
    images: {
      type: 'text[]',
    },
    // Snapshot of raw provider data for debugging / re-processing
    provider_data: {
      type: 'jsonb',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
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

  // Indexes
  pgm.createIndex('hotel_offers', 'hotel_id');
  pgm.createIndex('hotel_offers', 'location');
  pgm.createIndex('hotel_offers', 'stars');
  pgm.createIndex('hotel_offers', 'price_per_night');
  pgm.createIndex('hotel_offers', 'currency');
  pgm.createIndex('hotel_offers', 'is_hajj_package', {
    where: 'is_hajj_package = TRUE',
  });
  pgm.createIndex('hotel_offers', 'is_umrah_package', {
    where: 'is_umrah_package = TRUE',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('hotel_offers');
};
