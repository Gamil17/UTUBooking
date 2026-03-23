'use strict';

const { Router } = require('express');
const repo       = require('../repositories/tenant.repo');

const router = Router();

/**
 * GET /api/tenants/by-domain?domain=almosafer.utubooking.com
 *
 * Returns branding-only config for a tenant matching the given domain.
 * Called by the Next.js edge middleware on every request — no auth required.
 * Returns only public-safe fields (no api_key, no commission rates).
 *
 * Response 200: { id, slug, name, logo_url, primary_color, secondary_color,
 *                 currency, locale, enabled_modules, hide_platform_branding }
 * Response 404: tenant not found or inactive
 */
router.get('/by-domain', async (req, res, next) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '`domain` query param is required' });
    }

    const tenant = await repo.findByDomain(domain);
    if (!tenant) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'No active tenant found for this domain' });
    }

    return res.json(tenant);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
