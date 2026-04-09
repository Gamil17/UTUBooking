'use strict';

/**
 * Migration 037 — Career Applications
 *
 * Creates the career_applications table to track job applications submitted
 * through the UTUBooking careers page. HR manages applications via the
 * admin dashboard at /admin/careers/applications.
 */

exports.up = (pgm) => {
  pgm.createType('application_status', [
    'applied',
    'reviewing',
    'interviewing',
    'offered',
    'rejected',
    'withdrawn',
  ]);

  pgm.createTable('career_applications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    applicant_name: {
      type: 'varchar(200)',
      notNull: true,
    },
    email: {
      type: 'varchar(320)',
      notNull: true,
    },
    phone: {
      type: 'varchar(50)',
      notNull: false,
      default: null,
    },
    position: {
      type: 'varchar(200)',
      notNull: true,
    },
    linkedin_url: {
      type: 'varchar(500)',
      notNull: false,
      default: null,
    },
    cover_letter: {
      type: 'text',
      notNull: true,
    },
    // CV file metadata — actual file stored in S3 (cv_s3_key) in production.
    // cv_s3_key is null until S3 upload is wired up.
    cv_filename: {
      type: 'varchar(255)',
      notNull: false,
      default: null,
    },
    cv_size_bytes: {
      type: 'integer',
      notNull: false,
      default: null,
    },
    cv_mime_type: {
      type: 'varchar(100)',
      notNull: false,
      default: null,
    },
    cv_s3_key: {
      type: 'varchar(500)',
      notNull: false,
      default: null,
      comment: 'S3 object key — set after file is uploaded to AWS S3 bucket',
    },
    status: {
      type: 'application_status',
      notNull: true,
      default: 'applied',
    },
    admin_notes: {
      type: 'text',
      notNull: false,
      default: null,
    },
    reviewed_by: {
      type: 'varchar(200)',
      notNull: false,
      default: null,
    },
    reviewed_at: {
      type: 'timestamptz',
      notNull: false,
      default: null,
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

  pgm.createIndex('career_applications', 'status');
  pgm.createIndex('career_applications', 'email');
  pgm.createIndex('career_applications', 'position');
  pgm.createIndex('career_applications', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('career_applications');
  pgm.dropType('application_status');
};
