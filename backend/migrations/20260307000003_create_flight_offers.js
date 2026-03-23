/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('cabin_class', ['economy', 'business', 'first']);

  pgm.createTable('flight_offers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    flight_num: {
      type: 'varchar(20)',
      notNull: true,
    },
    airline_code: {
      type: 'char(2)',
      notNull: true,
    },
    origin: {
      type: 'char(3)',
      notNull: true,       // IATA airport code, e.g. 'RUH', 'CAI', 'DXB'
    },
    dest: {
      type: 'char(3)',
      notNull: true,       // e.g. 'JED' (Jeddah — King Abdulaziz, gateway to Makkah)
    },
    departure: {
      type: 'timestamptz',
      notNull: true,
    },
    arrival: {
      type: 'timestamptz',
      notNull: true,
    },
    cabin_class: {
      type: 'cabin_class',
      notNull: true,
      default: 'economy',
    },
    seats_available: {
      type: 'smallint',
      notNull: true,
      default: 0,
    },
    price: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',
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
  pgm.createIndex('flight_offers', ['origin', 'dest', 'departure']);
  pgm.createIndex('flight_offers', 'departure');
  pgm.createIndex('flight_offers', 'airline_code');
  pgm.createIndex('flight_offers', 'cabin_class');
  pgm.createIndex('flight_offers', 'price');
  pgm.createIndex('flight_offers', 'currency');
};

exports.down = (pgm) => {
  pgm.dropTable('flight_offers');
  pgm.dropType('cabin_class');
};
