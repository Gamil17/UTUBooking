/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enum for user roles
  pgm.createType('user_role', ['guest', 'user', 'agent', 'admin']);

  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    role: {
      type: 'user_role',
      notNull: true,
      default: 'user',
    },
    // Profile fields — bilingual for KSA/Gulf market
    name_en: {
      type: 'varchar(255)',
    },
    name_ar: {
      type: 'varchar(255)',
    },
    phone: {
      type: 'varchar(20)',
      unique: true,
    },
    preferred_currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'SAR',  // SAR-first per CLAUDE.md
    },
    preferred_lang: {
      type: 'varchar(5)',
      notNull: true,
      default: 'en',
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

  // Indexes
  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'role');
  pgm.createIndex('users', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('users');
  pgm.dropType('user_role');
};
