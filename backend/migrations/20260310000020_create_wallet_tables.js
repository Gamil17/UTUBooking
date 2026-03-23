/**
 * Migration: create wallet tables
 * Tables: wallets, fx_rates, wallet_tx
 * Type:    wallet_tx_type enum
 */

exports.up = (pgm) => {
  pgm.createType('wallet_tx_type', ['topup', 'debit', 'convert_out', 'convert_in', 'refund']);

  pgm.createTable('wallets', {
    id: {
      type:    'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: { type: 'uuid', notNull: true },
    currency: { type: 'varchar(3)', notNull: true },
    balance: {
      type:    'numeric(18,6)',
      notNull: true,
      default: 0,
      check:   'balance >= 0',
    },
    locked_balance: {
      type:    'numeric(18,6)',
      notNull: true,
      default: 0,
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.addConstraint('wallets', 'wallets_user_currency_unique', 'UNIQUE (user_id, currency)');
  pgm.createIndex('wallets', 'user_id');

  pgm.createTable('fx_rates', {
    id: {
      type:    'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    from_ccy:   { type: 'varchar(3)', notNull: true },
    to_ccy:     { type: 'varchar(3)', notNull: true },
    rate:       { type: 'numeric(18,8)', notNull: true },
    fetched_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.addConstraint('fx_rates', 'fx_rates_pair_unique', 'UNIQUE (from_ccy, to_ccy)');

  // wallet_tx is IMMUTABLE — rows are never updated
  pgm.createTable('wallet_tx', {
    id: {
      type:    'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    wallet_id: {
      type:       'uuid',
      notNull:    true,
      references: '"wallets"',
      onDelete:   'RESTRICT',
    },
    amount:     { type: 'numeric(18,6)', notNull: true },
    type:       { type: 'wallet_tx_type', notNull: true },
    booking_id: { type: 'uuid' },
    ref_tx_id:  { type: 'uuid' },  // links convert_out ↔ convert_in pair
    note:       { type: 'text' },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('wallet_tx', 'wallet_id');
};

exports.down = (pgm) => {
  pgm.dropTable('wallet_tx');
  pgm.dropTable('fx_rates');
  pgm.dropTable('wallets');
  pgm.dropType('wallet_tx_type');
};
