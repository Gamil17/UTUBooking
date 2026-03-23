/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('tenant_configs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: '"tenants"',
      onDelete: 'CASCADE',
    },
    // Revenue share per product type — e.g. {"hotel":0.60,"flight":0.60,"car":0.60}
    // Keys are UTUBooking's share; partner gets (1 - value)
    commission_rates: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func(`'{"hotel":0.60,"flight":0.60,"car":0.60}'::jsonb`),
    },
    // Which UTUBooking modules the partner can offer
    enabled_modules: {
      type: 'text[]',
      notNull: true,
      default: pgm.func(`ARRAY['hotel','flight','car']`),
    },
    // When true, "Powered by UTUBooking" footer is hidden
    hide_platform_branding: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    // Partner's revenue share percentage (40 = 40%)
    revenue_share_pct: {
      type: 'numeric(5,2)',
      notNull: true,
      default: 40.00,
    },
    // Auto-generated API key for partner to authenticate with public APIs
    api_key: {
      type: 'text',
      notNull: true,
      unique: true,
      default: pgm.func('gen_random_uuid()::text'),
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

  pgm.createIndex('tenant_configs', 'tenant_id');
  pgm.createIndex('tenant_configs', 'api_key');
};

exports.down = (pgm) => {
  pgm.dropTable('tenant_configs');
};
