/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('vehicle_type', ['economy', 'compact', 'suv', 'van', 'luxury', 'minibus']);
  pgm.createType('transmission_type', ['automatic', 'manual']);

  pgm.createTable('car_offers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // Rental vendor reference (e.g. Budget, Hertz, local KSA vendors)
    vendor_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    vendor_name: {
      type: 'varchar(255)',
    },
    vehicle_type: {
      type: 'vehicle_type',
      notNull: true,
    },
    model: {
      type: 'varchar(100)',
    },
    seats: {
      type: 'smallint',
      notNull: true,
      default: 5,
    },
    transmission: {
      type: 'transmission_type',
      notNull: true,
      default: 'automatic',
    },
    pickup_location: {
      type: 'varchar(255)',
      notNull: true,    // city or landmark, e.g. 'Makkah — Al Haram District'
    },
    dropoff_location: {
      type: 'varchar(255)',
    },
    available_from: {
      type: 'date',
      notNull: true,
    },
    available_to: {
      type: 'date',
      notNull: true,
    },
    price_per_day: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',
    },
    features: {
      type: 'text[]',   // e.g. ['GPS', 'Child seat', 'Full insurance']
    },
    // Raw provider snapshot
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
  pgm.createIndex('car_offers', 'vendor_id');
  pgm.createIndex('car_offers', 'vehicle_type');
  pgm.createIndex('car_offers', 'pickup_location');
  pgm.createIndex('car_offers', ['available_from', 'available_to']);
  pgm.createIndex('car_offers', 'price_per_day');
  pgm.createIndex('car_offers', 'currency');
};

exports.down = (pgm) => {
  pgm.dropTable('car_offers');
  pgm.dropType('vehicle_type');
  pgm.dropType('transmission_type');
};
