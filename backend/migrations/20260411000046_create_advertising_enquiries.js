'use strict';

/**
 * Migration 046 — Create advertising_enquiries table
 *
 * Stores inbound advertising and media partnership enquiries submitted
 * via /advertise/partner (AdvertisingPartnerForm → BFF → admin service).
 *
 * The router (advertising.router.js) also bootstraps this table on startup,
 * but the migration is the canonical schema source for CI/CD and fresh deploys.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('advertising_enquiries', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    full_name: {
      type:     'text',
      notNull:  true,
    },
    company_name: {
      type:     'text',
      notNull:  true,
    },
    work_email: {
      type:     'text',
      notNull:  true,
    },
    phone: {
      type:     'text',
    },
    company_type: {
      type:    'text',
      notNull: true,
      default: 'other',
      check:   `company_type IN (
        'tourism_board','airline','hotel','ota','attractions',
        'car_rental','travel_tech','consumer_brands',
        'financial_payments','halal_brands','other'
      )`,
    },
    region: {
      type:    'text',
      notNull: true,
      default: 'global',
      check:   `region IN (
        'saudi_arabia','uae','gulf_gcc','mena',
        'muslim_world','se_asia','s_asia','global'
      )`,
    },
    goal: {
      type:    'text',
      notNull: true,
      default: 'brand_awareness',
      check:   `goal IN (
        'performance_marketing','brand_awareness','lead_generation',
        'app_growth','retargeting','product_launch','market_entry'
      )`,
    },
    budget_range: {
      type:    'text',
      notNull: true,
      default: 'lets_discuss',
      check:   `budget_range IN (
        'under_10k','10k_50k','50k_200k','over_200k','lets_discuss'
      )`,
    },
    message: {
      type: 'text',
    },
    consent: {
      type:    'boolean',
      notNull: true,
      default: false,
    },
    status: {
      type:    'text',
      notNull: true,
      default: 'new',
      check:   `status IN ('new','contacted','qualified','proposal_sent','won','lost','archived')`,
    },
    assigned_to: {
      type: 'text',
    },
    admin_notes: {
      type: 'text',
    },
    source: {
      type:    'text',
      notNull: true,
      default: "'website'",
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  pgm.createIndex('advertising_enquiries', 'status',       { ifNotExists: true });
  pgm.createIndex('advertising_enquiries', 'company_type', { ifNotExists: true });
  pgm.createIndex('advertising_enquiries', 'created_at',   { ifNotExists: true, order: { created_at: 'DESC' } });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('advertising_enquiries', { ifExists: true });
};
