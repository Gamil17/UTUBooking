'use strict';

const { Router }      = require('express');
const searchController = require('../controllers/search.controller');

const router = Router();

router.get('/search', searchController.searchCars);

module.exports = router;
