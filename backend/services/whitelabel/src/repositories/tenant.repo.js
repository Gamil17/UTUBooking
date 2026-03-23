'use strict';

const { pool, readPool } = require('../db/pg');

/**
 * Create a tenant + its config in a single transaction.
 * @param {object} data - Validated payload from tenant.validator.js
 * @returns {object} - { tenant, config }
 */
async function createTenant(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantResult = await client.query(
      `INSERT INTO tenants
         (slug, name, domain, custom_domain, logo_url, primary_color, secondary_color, currency, locale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.slug,
        data.name,
        data.domain,
        data.custom_domain || null,
        data.logo_url || null,
        data.primary_color,
        data.secondary_color,
        data.currency,
        data.locale,
      ]
    );

    const tenant = tenantResult.rows[0];

    const configResult = await client.query(
      `INSERT INTO tenant_configs
         (tenant_id, commission_rates, enabled_modules, hide_platform_branding, revenue_share_pct)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        tenant.id,
        JSON.stringify(data.commission_rates),
        data.enabled_modules,
        data.hide_platform_branding,
        data.revenue_share_pct,
      ]
    );

    const config = configResult.rows[0];

    await client.query('COMMIT');
    return { tenant, config };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Find tenant + config by ID.
 */
async function findById(id) {
  const { rows } = await readPool.query(
    `SELECT t.*, tc.commission_rates, tc.enabled_modules,
            tc.hide_platform_branding, tc.revenue_share_pct, tc.api_key
     FROM tenants t
     JOIN tenant_configs tc ON tc.tenant_id = t.id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Find tenant + config by domain or custom_domain.
 * Used by the Next.js edge middleware for subdomain resolution.
 */
async function findByDomain(domain) {
  const { rows } = await readPool.query(
    `SELECT t.id, t.slug, t.name, t.logo_url,
            t.primary_color, t.secondary_color, t.currency, t.locale, t.active,
            tc.enabled_modules, tc.hide_platform_branding
     FROM tenants t
     JOIN tenant_configs tc ON tc.tenant_id = t.id
     WHERE (t.domain = $1 OR t.custom_domain = $1) AND t.active = true`,
    [domain]
  );
  return rows[0] || null;
}

/**
 * Update tenant fields (partial update supported).
 */
async function updateTenant(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = [
    'name', 'domain', 'custom_domain', 'logo_url',
    'primary_color', 'secondary_color', 'currency', 'locale',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

/**
 * Aggregate booking GMV by product_type for a tenant within a date range.
 * Queries the read replica.
 */
async function getTenantAnalytics(tenantId, from, to) {
  const { rows } = await readPool.query(
    `SELECT
       product_type,
       COUNT(*)::int           AS bookings,
       COALESCE(SUM(total_price), 0)::numeric  AS gmv,
       COALESCE(AVG(total_price), 0)::numeric  AS avg_order
     FROM bookings
     WHERE tenant_id = $1
       AND created_at >= $2
       AND created_at <  $3
     GROUP BY product_type
     ORDER BY product_type`,
    [tenantId, from, to]
  );
  return rows;
}

module.exports = { createTenant, findById, findByDomain, updateTenant, getTenantAnalytics };
