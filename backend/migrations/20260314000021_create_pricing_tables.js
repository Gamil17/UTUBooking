/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('pricing_rec_status', ['pending', 'accepted', 'rejected']);
  pgm.createType('pricing_source',     ['ai', 'base']);

  // AI pricing recommendations — created by the pricing service every 6h
  pgm.createTable('pricing_recommendations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // Matches hotel_offers.hotel_id (varchar, external reference e.g. hotelbeds code)
    hotel_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    base_price: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    recommended_price: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',
    },
    // 0.000 – 1.000 — how confident the AI is in this recommendation
    confidence_score: {
      type: 'numeric(4,3)',
      notNull: true,
    },
    // 1-2 sentence explanation shown to admin
    reasoning: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'pricing_rec_status',
      notNull: true,
      default: 'pending',
    },
    // Admin rejection note (optional)
    admin_note: {
      type: 'text',
    },
    // 'hajj' | 'umrah_peak' | 'normal'
    season: {
      type: 'varchar(20)',
      notNull: true,
    },
    // 0.00 – 100.00 — estimated occupancy at time of recommendation
    occupancy_pct: {
      type: 'numeric(5,2)',
    },
    // Search demand hits (from Redis hotel:searches:{id}:{date})
    demand_count: {
      type: 'integer',
    },
    check_in: {
      type: 'date',
    },
    check_out: {
      type: 'date',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    // Set when admin accepts or rejects
    decided_at: {
      type: 'timestamptz',
    },
  });

  pgm.createIndex('pricing_recommendations', 'hotel_id');
  pgm.createIndex('pricing_recommendations', 'status');
  pgm.createIndex('pricing_recommendations', 'created_at');
  pgm.createIndex('pricing_recommendations', ['hotel_id', 'status']);

  // Effective price timeline — one active row per hotel (valid_to IS NULL = current)
  pgm.createTable('pricing_snapshots', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    hotel_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    effective_price: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',
    },
    source: {
      type: 'pricing_source',
      notNull: true,
    },
    valid_from: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    // NULL means this is the current effective price
    valid_to: {
      type: 'timestamptz',
    },
    // FK to pricing_recommendations.id (only set when source = 'ai')
    rec_id: {
      type: 'uuid',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('pricing_snapshots', 'hotel_id');
  pgm.createIndex('pricing_snapshots', ['hotel_id', 'valid_from']);
  // Partial index for fast current-price lookups
  pgm.createIndex('pricing_snapshots', 'hotel_id', {
    name: 'idx_pricing_snapshots_current',
    where: 'valid_to IS NULL',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('pricing_snapshots');
  pgm.dropTable('pricing_recommendations');
  pgm.dropType('pricing_source');
  pgm.dropType('pricing_rec_status');
};
