/**
 * Migration: 20260324000024
 * Adds Mehram (Mahram) verification columns to bookings table.
 *
 * Required for Pakistan (PK) + India (IN) Hajj/Umrah bookings.
 * Saudi Arabia requires female pilgrims under 45 to travel with a male
 * guardian (Mahram) or in an official licensed group.
 *
 * References:
 *   Saudi Ministry of Hajj — Official Hajj Regulations 2025
 *   Pakistan Ministry of Religious Affairs — Hajj Policy 2025
 *   Haj Committee of India — Guidelines for Haj 2025
 */

exports.up = async (pgm) => {
  pgm.addColumn('bookings', {
    mehram_required: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
      comment: 'True for PK/IN female Hajj/Umrah travelers aged < 45',
    },
    mehram_companion_name: {
      type: 'VARCHAR(255)',
      comment: 'Full name of male guardian (Mahram) traveling with the pilgrim',
    },
    mehram_relationship: {
      type: 'VARCHAR(100)',
      comment: 'Relationship: husband | father | brother | son | uncle | grandfather',
    },
    mehram_group_operator: {
      type: 'VARCHAR(255)',
      comment: 'Licensed tour operator name when pilgrim joins authorized group',
    },
    mehram_verified_at: {
      type: 'TIMESTAMPTZ',
      comment: 'Timestamp when Mehram data was validated and saved',
    },
  });

  // Partial index — only rows that actually need Mehram tracking
  pgm.createIndex('bookings', 'mehram_required', {
    where: 'mehram_required = true',
    name:  'idx_bookings_mehram_required',
  });
};

exports.down = async (pgm) => {
  pgm.dropIndex('bookings', [], {
    name:     'idx_bookings_mehram_required',
    ifExists: true,
  });
  pgm.dropColumn('bookings', [
    'mehram_required',
    'mehram_companion_name',
    'mehram_relationship',
    'mehram_group_operator',
    'mehram_verified_at',
  ]);
};
