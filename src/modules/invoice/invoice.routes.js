const express = require('express');
const router = express.Router();
const invoiceController = require('./invoice.controller');

router.post('/create', invoiceController.handleCreateInvoice);
router.get('/:id', invoiceController.handleGetInvoice);

module.exports = router;
