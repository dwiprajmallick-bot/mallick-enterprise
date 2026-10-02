const express = require('express');
const router = express.Router();
const receivableController = require('./receivable.controller');

router.post('/payment', receivableController.handleRecordPayment);
router.get('/outstanding/:customerId', receivableController.handleGetOutstanding);

module.exports = router;
