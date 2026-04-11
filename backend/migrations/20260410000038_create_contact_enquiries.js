'use strict';

/**
 * Migration 038 — Contact Enquiries
 *
 * Creates the contact_enquiries table to persist every submission from the
 * /contact page form. Support staff manage enquiries via the admin dashboard
 * at /admin/contact.
 */

exports.up = (pgm) => {
  pgm.createTable('contact_enquiries', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    name: {
      type:    'varchar(200)',
      notNull: true,
    },
    email: {
      type:    'varchar(320)',
      notNull: true,
    },
    topic: {
      type:    'varchar(50)',
      notNull: true,
    },
    booking_ref: {
      type:    'varchar(100)',
      notNull: false,
      default: null,
    },
    message: {
      type:    'text',
      notNull: true,
    },
    // 'new' → support staff haven't opened it yet
    // 'read' → opened in admin dashboard
    // 'replied' → marked resolved / reply sent
    status: {
      type:    'varchar(20)',
      notNull: true,
      default: "'new'",
    },
    admin_notes: {
      type:    'text',
      notNull: false,
      default: null,
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

  pgm.createIndex('contact_enquiries', 'status');
  pgm.createIndex('contact_enquiries', 'email');
  pgm.createIndex('contact_enquiries', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('contact_enquiries');
};
