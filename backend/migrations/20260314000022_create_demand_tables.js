/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 90-day demand forecasts per hotel — upserted by pricing cron every 6h
  pgm.createTable('demand_forecasts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    hotel_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    forecast_date: {
      type: 'date',
      notNull: true,
    },
    // 0.00 – 100.00
    predicted_demand_pct: {
      type: 'numeric(5,2)',
      notNull: true,
    },
    // 0.000 – 1.000
    confidence: {
      type: 'numeric(4,3)',
      notNull: true,
    },
    // true if a push alert was sent to gold/platinum users for this forecast
    triggered_alert: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint(
    'demand_forecasts',
    'demand_forecasts_hotel_date_unique',
    'UNIQUE (hotel_id, forecast_date)',
  );
  pgm.createIndex('demand_forecasts', 'hotel_id');
  pgm.createIndex('demand_forecasts', 'forecast_date');

  // Lightweight funnel tracking — logged by the frontend on key user actions
  pgm.createTable('analytics_events', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // 'search' | 'detail_view' | 'booking_started' | 'booking_completed'
    event_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    hotel_id: {
      type: 'varchar(100)',
    },
    user_id: {
      type: 'uuid',
    },
    // ISO 3166-1 alpha-2, derived from IP or Accept-Language
    country: {
      type: 'varchar(2)',
    },
    // 'mobile' | 'desktop' | 'tablet'
    device_type: {
      type: 'varchar(20)',
    },
    session_id: {
      type: 'varchar(100)',
    },
    // Arbitrary extra context (search params, price seen, etc.)
    meta: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('analytics_events', 'event_type');
  pgm.createIndex('analytics_events', 'created_at');
  pgm.createIndex('analytics_events', 'country');
  pgm.createIndex('analytics_events', 'hotel_id');
};

exports.down = (pgm) => {
  pgm.dropTable('analytics_events');
  pgm.dropTable('demand_forecasts');
};
