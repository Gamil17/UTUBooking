/**
 * Migration: 20260324000025
 * Adds DPDP Act 2023 (India) consent tracking columns to users table.
 *
 * India's Digital Personal Data Protection Act 2023 requires UTUBooking to:
 *   1. Collect explicit, specific consent before processing personal data
 *   2. Maintain a record of when + how consent was given (with version)
 *   3. Support right-to-erasure requests with a tracked request timestamp
 *   4. Notify within 72 hours of a breach (handled separately)
 *
 * These columns support requirements 1–3.
 * The dpdp_consent_ip + user_agent are stored for audit (required by DPDP rules).
 *
 * Legal reference: DPDP Act 2023 §6 (consent), §12 (rights of data principal),
 *                  §13 (right to erasure)
 */

exports.up = async (pgm) => {
  pgm.addColumn('users', {
    dpdp_consent_given: {
      type:    'BOOLEAN',
      default: false,
      comment: 'True when the user has explicitly accepted the DPDP consent notice',
    },
    dpdp_consent_at: {
      type:    'TIMESTAMPTZ',
      comment: 'Timestamp of the most recent DPDP consent acceptance',
    },
    dpdp_consent_version: {
      type:    'VARCHAR(20)',
      comment: 'Consent notice version shown to the user (e.g. "1.0") — for audit',
    },
    dpdp_consent_ip: {
      type:    'INET',
      comment: 'IP address recorded at time of consent (DPDP audit requirement)',
    },
    dpdp_erasure_requested_at: {
      type:    'TIMESTAMPTZ',
      comment: 'Timestamp of the most recent right-to-erasure request (DPDP §13)',
    },
    dpdp_erasure_completed_at: {
      type:    'TIMESTAMPTZ',
      comment: 'Timestamp when the erasure request was fulfilled by the DPO/ops team',
    },
  });

  // Index to find Indian users who have pending erasure requests (DPO workflow)
  pgm.createIndex('users', 'dpdp_erasure_requested_at', {
    where: 'dpdp_erasure_requested_at IS NOT NULL AND dpdp_erasure_completed_at IS NULL',
    name:  'idx_users_dpdp_erasure_pending',
  });

  // Index for audit queries: which users gave consent on a given date
  pgm.createIndex('users', 'dpdp_consent_at', {
    where: 'dpdp_consent_given = true',
    name:  'idx_users_dpdp_consent_given',
  });
};

exports.down = async (pgm) => {
  pgm.dropIndex('users', [], { name: 'idx_users_dpdp_erasure_pending', ifExists: true });
  pgm.dropIndex('users', [], { name: 'idx_users_dpdp_consent_given',   ifExists: true });
  pgm.dropColumn('users', [
    'dpdp_consent_given',
    'dpdp_consent_at',
    'dpdp_consent_version',
    'dpdp_consent_ip',
    'dpdp_erasure_requested_at',
    'dpdp_erasure_completed_at',
  ]);
};
