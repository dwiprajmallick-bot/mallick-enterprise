const express = require('express');
const router = express.Router();

const productRoutes = require('../modules/product/product.routes');
const stockRoutes = require('../modules/stock/stock.routes');
const invoiceRoutes = require('../modules/invoice/invoice.routes');
const receivableRoutes = require('../modules/receivable/receivable.routes');

router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/receivables', receivableRoutes);

module.exports = router;
