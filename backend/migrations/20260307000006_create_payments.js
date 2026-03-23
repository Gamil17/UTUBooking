/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('payment_method', ['mada', 'stcpay', 'visa', 'mastercard', 'amex', 'apple_pay']);
  pgm.createType('payment_status', ['pending', 'completed', 'failed', 'refunded', 'disputed']);

  pgm.createTable('payments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    booking_id: {
      type: 'uuid',
      notNull: true,
      references: '"bookings"',
      onDelete: 'RESTRICT',   // never silently delete payment records
    },
    // Payment gateway transaction reference
    gateway_ref: {
      type: 'varchar(255)',
      unique: true,
    },
    amount: {
      type: 'numeric(12,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',
    },
    method: {
      type: 'payment_method',
      notNull: true,
    },
    status: {
      type: 'payment_status',
      notNull: true,
      default: 'pending',
    },
    // Refund amount (partial refunds supported)
    refund_amount: {
      type: 'numeric(12,2)',
    },
    // Full gateway webhook payload for audit trail
    gateway_payload: {
      type: 'jsonb',
    },
    paid_at: {
      type: 'timestamptz',
    },
    refunded_at: {
      type: 'timestamptz',
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

  // Indexes — booking_id and status are the primary query patterns
  pgm.createIndex('payments', 'booking_id');
  pgm.createIndex('payments', 'status');
  pgm.createIndex('payments', ['booking_id', 'status']);   // compound: "payments for booking X that are completed"
  pgm.createIndex('payments', 'gateway_ref');
  pgm.createIndex('payments', 'method');
  pgm.createIndex('payments', 'paid_at');
};

exports.down = (pgm) => {
  pgm.dropTable('payments');
  pgm.dropType('payment_status');
  pgm.dropType('payment_method');
};
