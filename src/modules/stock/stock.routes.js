const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');

router.post('/in', stockController.handleStockIn);
router.post('/reserve', stockController.handleReserve);
router.post('/dispatch', stockController.handleDispatch);
router.post('/adjust', stockController.handleAdjustment);
router.get('/overview', stockController.getStockOverview);

module.exports = router;
