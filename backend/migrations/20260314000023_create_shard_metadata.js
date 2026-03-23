/**
 * Migration: 20260314000023
 * Creates shard_registry table — maps countryCode → DB shard endpoints.
 * Populated by CloudFormation stack 12 (db-sharding.yml) SSM outputs.
 *
 * Apply to: ALL shards + primary DB (meta-level table lives on primary)
 */

exports.up = async (pgm) => {
  // Enum for supported market shards
  pgm.createType('shard_market', [
    'KSA', 'UAE', 'KWT', 'JOR', 'MAR', 'TUN', 'DEFAULT'
  ]);

  // Shard registry — one row per market
  pgm.createTable('shard_registry', {
    country_code: {
      type: 'VARCHAR(3)',
      primaryKey: true,
      comment: 'ISO 3166-1 alpha-3 country code (KSA, UAE, KWT, JOR, MAR, TUN)',
    },
    market: {
      type: 'shard_market',
      notNull: true,
    },
    shard_db_url: {
      type: 'TEXT',
      notNull: true,
      comment: 'Primary DB write endpoint (injected from SSM by deploy script)',
    },
    read_db_url: {
      type: 'TEXT',
      notNull: true,
      comment: 'Read replica endpoint (round-robin across replicas via PgBouncer)',
    },
    db_name: {
      type: 'VARCHAR(64)',
      notNull: true,
    },
    active: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },
    max_connections: {
      type: 'INTEGER',
      notNull: true,
      default: 20,
      comment: 'pg.Pool maxConnections per service instance for this shard',
    },
    created_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  }, {
    comment: 'Phase 4 shard routing table — maps countryCode to RDS endpoints',
  });

  // Trigger: auto-update updated_at
  pgm.createFunction(
    'update_shard_registry_updated_at',
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    `BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
     END;`
  );

  pgm.createTrigger('shard_registry', 'trg_shard_registry_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_shard_registry_updated_at',
  });

  // Seed initial rows — DB URLs injected by deploy.sh reading SSM outputs
  // Placeholder URLs; real values set by: scripts/apply-shard-urls.sh
  pgm.sql(`
    INSERT INTO shard_registry
      (country_code, market, shard_db_url, read_db_url, db_name, max_connections)
    VALUES
      ('SAU', 'KSA', 'SSM:/utu/db/ksa/url',     'SSM:/utu/db/ksa/read-url',     'utu_booking_ksa', 20),
      ('ARE', 'UAE', 'SSM:/utu/db/uae/url',     'SSM:/utu/db/uae/read-url',     'utu_booking_uae', 20),
      ('KWT', 'KWT', 'SSM:/utu/db/kwt/url',     'SSM:/utu/db/kwt/read-url',     'utu_booking_kwt', 15),
      ('JOR', 'JOR', 'SSM:/utu/db/jor/url',     'SSM:/utu/db/jor/read-url',     'utu_booking_jor', 15),
      ('MAR', 'MAR', 'SSM:/utu/db/mar/url',     'SSM:/utu/db/mar/read-url',     'utu_booking_mar', 15),
      ('TUN', 'TUN', 'SSM:/utu/db/tun/url',     'SSM:/utu/db/tun/read-url',     'utu_booking_tun', 15)
    ON CONFLICT (country_code) DO NOTHING;
  `);

  // Index for fast lookup
  pgm.createIndex('shard_registry', 'active');
};

exports.down = async (pgm) => {
  pgm.dropTable('shard_registry', { ifExists: true, cascade: true });
  pgm.dropFunction('update_shard_registry_updated_at', [], { ifExists: true });
  pgm.dropType('shard_market', { ifExists: true, cascade: true });
};
