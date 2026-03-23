/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('payment_audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // Nullable — may not exist yet when logging initiation failures
    payment_id: {
      type: 'uuid',
    },
    booking_id: {
      type: 'uuid',
    },
    // e.g. 'initiate', 'webhook_received', 'status_updated', 'refund_initiated'
    event: {
      type: 'varchar(100)',
      notNull: true,
    },
    // 'stcpay' | 'moyasar' | 'stripe'
    gateway: {
      type: 'varchar(50)',
      notNull: true,
    },
    amount: {
      type: 'numeric(12,2)',
    },
    currency: {
      type: 'varchar(3)',
      default: 'SAR',
    },
    // Payment status at the time of this log entry
    status: {
      type: 'varchar(50)',
    },
    // Full raw payload from gateway (for forensic audit trail)
    meta: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('payment_audit_logs', 'payment_id');
  pgm.createIndex('payment_audit_logs', 'booking_id');
  pgm.createIndex('payment_audit_logs', 'gateway');
  pgm.createIndex('payment_audit_logs', 'event');
  pgm.createIndex('payment_audit_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('payment_audit_logs');
};
