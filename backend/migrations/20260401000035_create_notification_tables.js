/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ── ENUMS ─────────────────────────────────────────────────────────────────

  pgm.createType('email_delivery_status', [
    'queued', 'sent', 'delivered', 'bounced', 'opened', 'failed',
  ]);

  pgm.createType('email_category', ['transactional', 'marketing']);

  pgm.createType('campaign_status', [
    'draft', 'scheduled', 'sending', 'sent', 'cancelled',
  ]);

  pgm.createType('suppression_type', ['manual', 'bounced', 'unsubscribed']);

  // ── email_campaigns ───────────────────────────────────────────────────────
  // Created before email_log so email_log can FK into it.

  pgm.createTable('email_campaigns', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    name: {
      type:    'varchar(255)',
      notNull: true,
    },
    subject_en: {
      type:    'text',
      notNull: true,
    },
    subject_ar: {
      type:    'text',
      notNull: false,
    },
    // Array of deal objects: [{ title_en, title_ar, price, currency, destination, cta_url }]
    deal_items: {
      type:    'jsonb',
      notNull: true,
      default: '[]',
    },
    status: {
      type:    'campaign_status',
      notNull: true,
      default: 'draft',
    },
    scheduled_for: {
      type:    'timestamptz',
      notNull: false,
    },
    started_at: {
      type:    'timestamptz',
      notNull: false,
    },
    completed_at: {
      type:    'timestamptz',
      notNull: false,
    },
    total_recipients: {
      type:    'integer',
      notNull: false,
    },
    sent_count: {
      type:    'integer',
      notNull: true,
      default: 0,
    },
    failed_count: {
      type:    'integer',
      notNull: true,
      default: 0,
    },
    opened_count: {
      type:    'integer',
      notNull: true,
      default: 0,
    },
    created_by: {
      type:    'varchar(255)',
      notNull: true,
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

  pgm.createIndex('email_campaigns', 'status');
  pgm.createIndex('email_campaigns', 'scheduled_for', {
    where: 'scheduled_for IS NOT NULL',
  });

  // ── email_log ─────────────────────────────────────────────────────────────
  // Append-only. GDPR Art. 17: on erasure, anonymise user_id + recipient_email.
  // Never DELETE rows — they are compliance evidence of past sends.

  pgm.createTable('email_log', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    // SET NULL on user deletion so row survives as compliance evidence
    user_id: {
      type:       'uuid',
      notNull:    false,
      references: '"users"',
      onDelete:   'SET NULL',
    },
    // Snapshot of email at send time — survives user erasure
    recipient_email: {
      type:    'varchar(320)',
      notNull: true,
    },
    email_type: {
      type:    'varchar(60)',
      notNull: true,
      // VALUES: 'abandoned_booking_recovery' | 'price_change_alert'
      //         | 'check_in_reminder' | 'monthly_deal_digest'
    },
    email_category: {
      type:    'email_category',
      notNull: true,
      default: 'transactional',
    },
    // No FK — booking may be cancelled/deleted later
    booking_id: {
      type:    'uuid',
      notNull: false,
    },
    booking_ref: {
      type:    'varchar(30)',
      notNull: false,
    },
    campaign_id: {
      type:       'uuid',
      notNull:    false,
      references: '"email_campaigns"',
      onDelete:   'SET NULL',
    },
    sendgrid_message_id: {
      type:    'varchar(255)',
      notNull: false,
    },
    locale: {
      type:    'varchar(10)',
      notNull: true,
      default: 'en',
    },
    subject: {
      type:    'varchar(500)',
      notNull: true,
    },
    delivery_status: {
      type:    'email_delivery_status',
      notNull: true,
      default: 'queued',
    },
    attempt_number: {
      type:    'integer',
      notNull: true,
      default: 1,
    },
    error_message: {
      type:    'text',
      notNull: false,
    },
    sent_at: {
      type:    'timestamptz',
      notNull: false,
    },
    delivered_at: {
      type:    'timestamptz',
      notNull: false,
    },
    opened_at: {
      type:    'timestamptz',
      notNull: false,
    },
    bounced_at: {
      type:    'timestamptz',
      notNull: false,
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('email_log', 'user_id');
  pgm.createIndex('email_log', 'booking_id');
  pgm.createIndex('email_log', 'email_type');
  pgm.createIndex('email_log', 'delivery_status');
  pgm.createIndex('email_log', 'created_at', { order: 'DESC' });
  pgm.createIndex('email_log', 'campaign_id', {
    where: 'campaign_id IS NOT NULL',
  });
  pgm.createIndex('email_log', 'sendgrid_message_id', {
    where: 'sendgrid_message_id IS NOT NULL',
  });

  pgm.sql(`
    COMMENT ON TABLE email_log IS
    'Append-only email send log. GDPR Art.17: UPDATE user_id=NULL, recipient_email=''erased@deleted.invalid'' on erasure. Never DELETE rows.';
  `);

  // ── email_suppressions ────────────────────────────────────────────────────
  // Manual "stop emailing" overrides by sales team + auto-bounce suppression.

  pgm.createTable('email_suppressions', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type:       'uuid',
      notNull:    true,
      references: '"users"',
      onDelete:   'CASCADE',
    },
    // NULL = suppress ALL emails for this user; non-NULL = suppress for specific booking only
    booking_id: {
      type:    'uuid',
      notNull: false,
    },
    suppression_type: {
      type:    'suppression_type',
      notNull: true,
      default: 'manual',
    },
    suppressed_by: {
      type:    'varchar(255)',
      notNull: false,
    },
    reason: {
      type:    'text',
      notNull: false,
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    // NULL = suppression still active; non-NULL = lifted by admin
    lifted_at: {
      type:    'timestamptz',
      notNull: false,
    },
  });

  pgm.createIndex('email_suppressions', 'user_id');
  pgm.createIndex('email_suppressions', 'booking_id', {
    where: 'booking_id IS NOT NULL',
  });
  // Fast "is this user currently suppressed?" lookup
  pgm.createIndex('email_suppressions', 'user_id', {
    name:  'idx_email_sup_active',
    where: 'lifted_at IS NULL',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('email_suppressions');
  pgm.dropTable('email_log');
  pgm.dropTable('email_campaigns');
  pgm.dropType('suppression_type');
  pgm.dropType('campaign_status');
  pgm.dropType('email_category');
  pgm.dropType('email_delivery_status');
};
