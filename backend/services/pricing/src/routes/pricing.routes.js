'use strict';

const { Router }            = require('express');
const { authenticateToken } = require('../middleware/auth');
const adminAuth             = require('../middleware/adminAuth');
const ctrl                  = require('../controllers/pricing.controller');

const router = Router();

// ── Public / hotel-service-facing ────────────────────────────────────────────

// Current effective price for a hotel (used by hotel search to show adjusted price)
router.get('/current/:hotelId', ctrl.getCurrentPrice);

// Generate AI recommendation (requires authenticated user — called by hotel-service or hotel UI)
router.post('/recommend', authenticateToken, ctrl.recommend);

// ── Admin endpoints (Bearer ADMIN_SECRET) ────────────────────────────────────

router.get('/recommendations',              adminAuth, ctrl.listRecommendations);
router.post('/recommendations/:id/accept',  adminAuth, ctrl.acceptRecommendation);
router.post('/recommendations/:id/reject',  adminAuth, ctrl.rejectRecommendation);
router.get('/metrics/revpar',               adminAuth, ctrl.getRevParMetrics);
router.get('/metrics/funnel',               adminAuth, ctrl.getFunnelMetrics);

// ── Internal cron endpoint (Lambda — x-internal-secret header) ───────────────

router.post('/internal/cron', (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  ctrl.runCron(req, res, next);
});

module.exports = router;
