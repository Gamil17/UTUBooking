/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('loyalty_tier', ['silver', 'gold', 'platinum']);

  pgm.createTable('loyalty_accounts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: '"users"',
      onDelete: 'RESTRICT',
    },
    tier: {
      type: 'loyalty_tier',
      notNull: true,
      default: 'silver',
    },
    // Redeemable balance (decreases on redemption)
    points: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    // Cumulative earned points — never decreases, drives tier computation
    lifetime_points: {
      type: 'integer',
      notNull: true,
      default: 0,
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

  pgm.createIndex('loyalty_accounts', 'user_id');
  pgm.createIndex('loyalty_accounts', 'tier');
};

exports.down = (pgm) => {
  pgm.dropTable('loyalty_accounts');
  pgm.dropType('loyalty_tier');
};
