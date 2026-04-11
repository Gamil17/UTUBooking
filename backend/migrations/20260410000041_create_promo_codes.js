exports.up = (pgm) => {
  pgm.createTable('promo_codes', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    code: {
      type:    'varchar(50)',
      notNull: true,
      unique:  true,
      comment: 'Always stored UPPERCASE',
    },
    title:            { type: 'varchar(200)', notNull: true },
    description:      { type: 'text' },
    discount_type:    { type: 'varchar(20)', notNull: true },   // 'percent' | 'fixed'
    discount_value:   { type: 'numeric(10,2)', notNull: true },
    currency:         { type: 'varchar(10)',  default: "'SAR'" },
    min_order_amount: { type: 'numeric(10,2)', default: 0 },
    max_uses:         { type: 'int' },                          // NULL = unlimited
    uses_count:       { type: 'int', default: 0 },
    expires_at:       { type: 'timestamptz' },                   // NULL = no expiry
    is_active:        { type: 'boolean', default: true },
    sort_order:       { type: 'int', default: 0 },
    created_at:       { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at:       { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'promo_codes',
    'promo_codes_discount_type_check',
    "discount_type IN ('percent', 'fixed')",
  );

  pgm.createIndex('promo_codes', 'code');
  pgm.createIndex('promo_codes', 'is_active');
  pgm.createIndex('promo_codes', ['sort_order', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('promo_codes');
};
