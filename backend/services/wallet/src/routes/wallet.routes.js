const { Router }            = require('express');
const { authenticateToken } = require('../middleware/auth');
const wallet                = require('../controllers/wallet.controller');

const router = Router();

router.get('/balance',   authenticateToken, wallet.getBalance);
router.post('/topup',    authenticateToken, wallet.topup);
router.post('/convert',  authenticateToken, wallet.convert);
router.get('/fx-rates',                    wallet.getFxRates); // public

module.exports = router;
