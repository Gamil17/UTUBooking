/* eslint-disable camelcase */
'use strict';

/**
 * Migration 044 — Corporate role + portal user linkage
 *
 * 1. Adds 'corporate' value to the user_role enum so corporate portal
 *    accounts can be distinguished from regular traveller accounts.
 *
 * 2. Adds corporate_account_id (FK → corporate_accounts) to the users
 *    table so every portal login can be tied back to its company.
 *
 * Note: ALTER TYPE ADD VALUE is a DDL statement that PostgreSQL 12+
 * allows inside a transaction, but we run noTransaction here for
 * compatibility with older versions deployed on AWS GCC.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Extend user_role enum — IF NOT EXISTS prevents errors on re-runs
  pgm.sql("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'corporate'");

  // Link portal users to their corporate account
  pgm.addColumn('users', {
    corporate_account_id: {
      type:    'uuid',
      notNull: false,
      default: null,
      comment: 'Set only when role = corporate. Points to corporate_accounts.id',
    },
  });

  pgm.createIndex('users', 'corporate_account_id', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('users', 'corporate_account_id');
  pgm.dropColumn('users', 'corporate_account_id');
  // Intentionally NOT removing the 'corporate' enum value —
  // PostgreSQL does not support removing enum values.
};
