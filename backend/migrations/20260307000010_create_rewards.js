/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('reward_type', ['discount', 'upgrade', 'free_night', 'voucher']);

  pgm.createTable('rewards', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name_en: {
      type: 'text',
      notNull: true,
    },
    name_ar: {
      type: 'text',
      notNull: true,
    },
    points_cost: {
      type: 'integer',
      notNull: true,
      check: 'points_cost > 0',
    },
    type: {
      type: 'reward_type',
      notNull: true,
    },
    // SAR value granted when this reward is redeemed (for discount/voucher types)
    discount_sar: {
      type: 'numeric(10,2)',
    },
    valid_until: {
      type: 'timestamptz',
    },
    is_active: {
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

  pgm.createIndex('rewards', 'is_active');
  pgm.createIndex('rewards', 'type');
  pgm.createIndex('rewards', 'valid_until');
};

exports.down = (pgm) => {
  pgm.dropTable('rewards');
  pgm.dropType('reward_type');
};
