'use strict';

/**
 * Migration 043 — Add assignment + priority to contact_enquiries
 *
 * Adds ticket-management fields so support agents can:
 *   - assigned_to : agent email or name who owns this ticket
 *   - priority    : 'low' | 'normal' | 'high' | 'urgent'
 *   - due_at      : deadline timestamp for SLA tracking
 */

exports.up = (pgm) => {
  pgm.addColumn('contact_enquiries', {
    assigned_to: {
      type:    'varchar(255)',
      notNull: false,
      default: null,
      comment: 'Agent email or name who owns this enquiry',
    },
    priority: {
      type:    'varchar(20)',
      notNull: true,
      default: "'normal'",
      comment: 'low | normal | high | urgent',
    },
    due_at: {
      type:    'timestamptz',
      notNull: false,
      default: null,
      comment: 'SLA deadline — set by agent or automatically based on priority',
    },
  });

  pgm.createIndex('contact_enquiries', 'assigned_to');
  pgm.createIndex('contact_enquiries', 'priority');
  pgm.createIndex('contact_enquiries', 'due_at');
};

exports.down = (pgm) => {
  pgm.dropIndex('contact_enquiries', 'due_at');
  pgm.dropIndex('contact_enquiries', 'priority');
  pgm.dropIndex('contact_enquiries', 'assigned_to');
  pgm.dropColumn('contact_enquiries', ['assigned_to', 'priority', 'due_at']);
};
