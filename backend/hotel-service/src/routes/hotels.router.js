const { Router } = require('express');
const { searchHotelsHandler }  = require('../controllers/search.controller');
const { getHalalRestaurants }  = require('../controllers/poi.controller');

const router = Router();

router.get('/search',      searchHotelsHandler);

// GET /api/v1/hotels/poi/halal — halal restaurants near lat/lng (Google Places)
router.get('/poi/halal',   getHalalRestaurants);

module.exports = router;
