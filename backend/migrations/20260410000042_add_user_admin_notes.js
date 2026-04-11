'use strict';

/**
 * Migration 042 — Add admin_notes to users table
 *
 * Allows sales/support agents to leave internal notes on a customer profile.
 * Notes are shown on the Customer 360 page and saved via
 * PATCH /admin/api/users/:id/notes (admin service).
 */

exports.up = (pgm) => {
  pgm.addColumn('users', {
    admin_notes: {
      type:    'text',
      notNull: false,
      default: null,
    },
    admin_notes_updated_at: {
      type:    'timestamptz',
      notNull: false,
      default: null,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', ['admin_notes', 'admin_notes_updated_at']);
};
