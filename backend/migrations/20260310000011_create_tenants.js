/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('tenants', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // Subdomain key — e.g. "almosafer" for almosafer.utubooking.com
    slug: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    name: {
      type: 'text',
      notNull: true,
    },
    // Primary domain assigned by UTUBooking
    domain: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    // Optional CNAME partner domain (e.g. hajj.almosafer.com)
    custom_domain: {
      type: 'text',
      unique: true,
    },
    logo_url: {
      type: 'text',
    },
    primary_color: {
      type: 'text',
      notNull: true,
      default: "'#10B981'",
    },
    secondary_color: {
      type: 'text',
      notNull: true,
      default: "'#111827'",
    },
    // SAR/AED/USD/JOD/EGP
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: "'USD'",
    },
    // en / ar / ar-SA / ar-JO / ar-EG
    locale: {
      type: 'varchar(10)',
      notNull: true,
      default: "'en'",
    },
    active: {
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

  pgm.createIndex('tenants', 'slug');
  pgm.createIndex('tenants', 'domain');
  pgm.createIndex('tenants', 'custom_domain');
  pgm.createIndex('tenants', 'active');
};

exports.down = (pgm) => {
  pgm.dropTable('tenants');
};
