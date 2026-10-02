const express = require('express');
const router = express.Router();
const productController = require('./product.controller');

router.get('/', productController.getAllProducts);
router.post('/add', productController.createProduct);
router.put('/:id', productController.updateProduct);

module.exports = router;
