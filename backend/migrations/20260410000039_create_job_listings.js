'use strict';

/**
 * Migration 039 — Job Listings
 *
 * Creates the job_listings table so open positions on the /careers page
 * are managed from the admin dashboard at /admin/careers/jobs rather than
 * being hardcoded in i18n strings.
 */

exports.up = (pgm) => {
  pgm.createTable('job_listings', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    title: {
      type:    'varchar(200)',
      notNull: true,
    },
    team: {
      type:    'varchar(100)',
      notNull: true,
    },
    location: {
      type:    'varchar(150)',
      notNull: true,
    },
    type: {
      type:    'varchar(50)',
      notNull: true,
    },
    description: {
      type:    'text',
      notNull: false,
      default: null,
    },
    is_active: {
      type:    'boolean',
      notNull: true,
      default: true,
    },
    // Lower sort_order = appears first on the page
    sort_order: {
      type:    'integer',
      notNull: true,
      default: 0,
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
  });

  pgm.createIndex('job_listings', 'is_active');
  pgm.createIndex('job_listings', ['sort_order', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('job_listings');
};
