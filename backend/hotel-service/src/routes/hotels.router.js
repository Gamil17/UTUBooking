const { Router } = require('express');
const { searchHotelsHandler } = require('../controllers/search.controller');

const router = Router();

router.get('/search', searchHotelsHandler);

module.exports = router;
