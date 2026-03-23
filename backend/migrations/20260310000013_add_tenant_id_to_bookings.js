/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('bookings', {
    tenant_id: {
      type: 'uuid',
      references: '"tenants"',
      onDelete: 'SET NULL',
      // NULL = direct UTUBooking booking (no white-label partner)
    },
  });

  pgm.createIndex('bookings', 'tenant_id');
  // Compound index for tenant analytics queries
  pgm.createIndex('bookings', ['tenant_id', 'product_type']);
  pgm.createIndex('bookings', ['tenant_id', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropIndex('bookings', ['tenant_id', 'created_at']);
  pgm.dropIndex('bookings', ['tenant_id', 'product_type']);
  pgm.dropIndex('bookings', 'tenant_id');
  pgm.dropColumn('bookings', 'tenant_id');
};
