'use strict';

const { Router }  = require('express');
const adminAuth   = require('../middleware/adminAuth');
const repo        = require('../repositories/tenant.repo');
const { validateCreate, validateUpdate } = require('../validators/tenant.validator');

const router = Router();

// All admin routes require Bearer ADMIN_SECRET
router.use(adminAuth);

/**
 * GET /api/admin/tenants
 * List all tenants with their config.
 */
router.get('/', async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  ?? 50), 100);
    const offset = parseInt(req.query.offset ?? 0);
    const search = req.query.search || null;

    const conditions = [];
    const values     = [];
    let   i          = 1;

    if (search) {
      conditions.push(`(t.slug ILIKE $${i} OR t.name ILIKE $${i} OR t.domain ILIKE $${i})`);
      values.push(`%${search}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { pool } = require('../db/pg');

    const { rows } = await pool.query(
      `SELECT t.id, t.slug, t.name, t.domain, t.custom_domain, t.logo_url,
              t.primary_color, t.secondary_color, t.currency, t.locale, t.active,
              t.created_at, t.updated_at,
              tc.commission_rates, tc.enabled_modules,
              tc.hide_platform_branding, tc.revenue_share_pct
         FROM tenants t
         JOIN tenant_configs tc ON tc.tenant_id = t.id
         ${where}
        ORDER BY t.created_at DESC
        LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    );

    const totalRes = await pool.query(
      `SELECT COUNT(*) FROM tenants t ${where}`,
      values
    );

    return res.json({ total: parseInt(totalRes.rows[0].count), rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/tenants
 * Provision a new white-label tenant + config.
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = validateCreate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.details.map((d) => d.message).join('; '),
      });
    }
    const { tenant, config } = await repo.createTenant(value);
    return res.status(201).json({ tenant, config });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'CONFLICT', message: 'Tenant slug or domain already exists' });
    }
    next(err);
  }
});

/**
 * GET /api/admin/tenants/:id
 * Retrieve tenant + config by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tenant = await repo.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'NOT_FOUND', message: 'Tenant not found' });
    return res.json(tenant);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/tenants/:id
 * Update tenant branding or domain fields.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { error, value } = validateUpdate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.details.map((d) => d.message).join('; '),
      });
    }
    const tenant = await repo.updateTenant(req.params.id, value);
    if (!tenant) return res.status(404).json({ error: 'NOT_FOUND', message: 'Tenant not found' });
    return res.json(tenant);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'CONFLICT', message: 'Domain already in use by another tenant' });
    }
    next(err);
  }
});

/**
 * GET /api/admin/tenants/:id/analytics?from=2026-01-01&to=2026-03-09
 * Return GMV breakdown by product_type for the given date range.
 */
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '`from` and `to` query params are required (ISO date)' });
    }
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    if (isNaN(fromDate) || isNaN(toDate) || fromDate >= toDate) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '`from` must be a valid date before `to`' });
    }

    const rows = await repo.getTenantAnalytics(req.params.id, fromDate, toDate);
    return res.json({ tenant_id: req.params.id, from, to, breakdown: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
