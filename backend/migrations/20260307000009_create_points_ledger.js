/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('points_action', ['earn', 'redeem', 'expire', 'adjust']);

  pgm.createTable('points_ledger', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'RESTRICT',
    },
    // Nullable — adjustments and expirations may not reference a booking
    booking_id: {
      type: 'uuid',
      references: '"bookings"',
      onDelete: 'RESTRICT',
    },
    // Positive = earn / adjust-up, Negative = redeem / expire
    points: {
      type: 'integer',
      notNull: true,
    },
    action: {
      type: 'points_action',
      notNull: true,
    },
    note: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('points_ledger', 'user_id');
  pgm.createIndex('points_ledger', 'booking_id');
  pgm.createIndex('points_ledger', 'action');
  pgm.createIndex('points_ledger', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('points_ledger');
  pgm.dropType('points_action');
};
