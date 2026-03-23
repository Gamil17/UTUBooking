'use strict';

const { Router } = require('express');
const { authenticateToken } = require('../middleware/authenticate');
const ctrl = require('../controllers/loyalty.controller');

const router = Router();

// All loyalty routes require a valid JWT
router.use(authenticateToken);

router.get('/account',  ctrl.getAccount);
router.post('/earn',    ctrl.earn);
router.post('/redeem',  ctrl.redeem);
router.get('/rewards',  ctrl.getRewards);

module.exports = router;
