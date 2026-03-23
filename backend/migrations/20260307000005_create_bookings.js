/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('product_type', ['hotel', 'flight', 'car']);
  pgm.createType('booking_status', ['pending', 'confirmed', 'cancelled', 'completed', 'refunded']);

  pgm.createTable('bookings', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // Human-readable reference, e.g. UTU-2026-A7X3K
    reference_no: {
      type: 'varchar(20)',
      notNull: true,
      unique: true,
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'RESTRICT',   // prevent user deletion while bookings exist
    },
    product_type: {
      type: 'product_type',
      notNull: true,
    },
    // Polymorphic reference to hotel_offers / flight_offers / car_offers
    offer_id: {
      type: 'uuid',
      notNull: true,
    },
    status: {
      type: 'booking_status',
      notNull: true,
      default: 'pending',
    },
    // Pricing snapshot at time of booking (immutable after creation)
    total_price: {
      type: 'numeric(12,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',
    },
    // Date range (applicable to hotels and cars)
    check_in: {
      type: 'date',
    },
    check_out: {
      type: 'date',
    },
    // Guest count / passenger names / special requests
    details: {
      type: 'jsonb',
    },
    // Internal notes (not visible to customer)
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

  // Indexes — userId and status are the primary query patterns
  pgm.createIndex('bookings', 'user_id');
  pgm.createIndex('bookings', 'status');
  pgm.createIndex('bookings', ['user_id', 'status']);   // compound: "my pending bookings"
  pgm.createIndex('bookings', 'reference_no');
  pgm.createIndex('bookings', 'product_type');
  pgm.createIndex('bookings', 'offer_id');
  pgm.createIndex('bookings', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('bookings');
  pgm.dropType('booking_status');
  pgm.dropType('product_type');
};
