'use strict';

/**
 * Migration 036 — Multi-Level Admin System
 *
 * 1. Extends user_role enum with country_admin + super_admin
 * 2. Adds admin_country column to users (which country a country_admin manages)
 * 3. Creates admin_audit_log table for immutable audit trail
 *
 * Role hierarchy:
 *   super_admin    — global; manages country admins; sees all data
 *   country_admin  — scoped to admin_country; approves/rejects users in their country
 *   admin          — platform admin (existing)
 *   agent          — booking agent (existing)
 *   user           — registered user; requires approval before login
 *   guest          — unauthenticated (existing)
 */

exports.up = (pgm) => {
  // 1. Extend user_role enum
  // PostgreSQL does not support removing enum values, only adding.
  pgm.sql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'country_admin'`);
  pgm.sql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin'`);

  // 2. Add admin_country to users
  pgm.addColumn('users', {
    admin_country: {
      type: 'varchar(2)',
      notNull: false,
      default: null,
      comment: 'ISO-3166-1 alpha-2 country code this admin manages (country_admin role only)',
    },
  });
  pgm.createIndex('users', 'admin_country', {
    name: 'idx_users_admin_country',
    where: 'admin_country IS NOT NULL',
  });

  // 3. Create admin_audit_log
  pgm.createTable('admin_audit_log', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    admin_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    action: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'approve_user | reject_user | suspend_user | unsuspend_user | create_country_admin | remove_country_admin',
    },
    target_user_id: {
      type: 'uuid',
      notNull: false,
      references: '"users"',
      onDelete: 'SET NULL',
    },
    meta: {
      type: 'jsonb',
      notNull: false,
      comment: 'Additional context (rejection reason, old role, etc.)',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('admin_audit_log', 'admin_id');
  pgm.createIndex('admin_audit_log', 'target_user_id');
  pgm.createIndex('admin_audit_log', 'action');
  pgm.createIndex('admin_audit_log', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('admin_audit_log');
  pgm.dropColumn('users', 'admin_country');
  // Note: PostgreSQL cannot remove enum values — country_admin/super_admin remain in enum
  // but are no longer used after rollback.
};
