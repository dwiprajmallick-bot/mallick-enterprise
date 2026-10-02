const { StockItem, StockMovement } = require('./stock.model');

class StockService {
  async stockIn({ productId, quantity, referenceId, performedBy, unitCost }) {
    if (quantity <= 0) throw new Error('Quantity must be greater than zero');

    let stock = await StockItem.findOne({ productId });
    if (!stock) {
      stock = new StockItem({ productId, onHandQuantity: 0, costPrice: unitCost || 0 });
    }

    const previousQty = stock.onHandQuantity;
    stock.onHandQuantity += quantity;
    if (unitCost) stock.costPrice = unitCost;
    stock.updatedAt = new Date();
    await stock.save();

    await StockMovement.create({
      productId,
      type: 'GRN_RECEIPT',
      quantity,
      previousQuantity: previousQty,
      newQuantity: stock.onHandQuantity,
      referenceType: 'GRN',
      referenceId,
      performedBy,
      remark: 'Stock added via GRN'
    });

    return stock;
  }

  async reserveStock({ productId, quantity, orderId, performedBy }) {
    const stock = await StockItem.findOne({ productId });
    if (!stock) throw new Error('Product not found in stock');

    const available = stock.onHandQuantity - stock.reservedQuantity;
    if (available < quantity) {
      throw new Error(`Insufficient stock. Available: ${available}, Requested: ${quantity}`);
    }

    stock.reservedQuantity += quantity;
    stock.updatedAt = new Date();
    await stock.save();

    await StockMovement.create({
      productId,
      type: 'RESERVATION',
      quantity,
      previousQuantity: stock.onHandQuantity,
      newQuantity: stock.onHandQuantity,
      referenceType: 'ORDER',
      referenceId: orderId,
      performedBy,
      remark: `Reserved for Order #${orderId}`
    });

    return stock;
  }

  async confirmDispatch({ productId, quantity, invoiceId, performedBy }) {
    const stock = await StockItem.findOne({ productId });
    if (!stock) throw new Error('Product not found in stock');

    if (stock.onHandQuantity < quantity) {
      throw new Error('Stock is less than dispatch quantity');
    }

    const previousQty = stock.onHandQuantity;
    stock.onHandQuantity -= quantity;
    stock.reservedQuantity = Math.max(0, stock.reservedQuantity - quantity);
    stock.updatedAt = new Date();
    await stock.save();

    await StockMovement.create({
      productId,
      type: 'SALE_DISPATCH',
      quantity: -quantity,
      previousQuantity: previousQty,
      newQuantity: stock.onHandQuantity,
      referenceType: 'INVOICE',
      referenceId: invoiceId,
      performedBy,
      remark: 'Stock dispatched against invoice'
    });

    return stock;
  }

  async adjustStock({ productId, actualQuantity, reason, referenceId, performedBy }) {
    let stock = await StockItem.findOne({ productId });
    if (!stock) throw new Error('Product not found in stock');

    const previousQty = stock.onHandQuantity;
    const diff = actualQuantity - previousQty;
    stock.onHandQuantity = actualQuantity;
    stock.updatedAt = new Date();
    await stock.save();

    await StockMovement.create({
      productId,
      type: 'STOCK_ADJUSTMENT',
      quantity: diff,
      previousQuantity: previousQty,
      newQuantity: actualQuantity,
      referenceType: 'MANUAL_AUDIT',
      referenceId: referenceId || `AUDIT-${Date.now()}`,
      performedBy,
      remark: reason || 'Manual inventory correction'
    });

    return stock;
  }

  async getStockStatus() {
    const allStock = await StockItem.find().populate('productId', 'name sku price');
    const lowStockAlerts = [];

    const report = allStock.map(item => {
      const available = item.onHandQuantity - item.reservedQuantity;
      const isLowStock = available <= item.minAlertThreshold;

      if (isLowStock) {
        lowStockAlerts.push({
          product: item.productId,
          available,
          threshold: item.minAlertThreshold
        });
      }

      return {
        product: item.productId,
        onHand: item.onHandQuantity,
        reserved: item.reservedQuantity,
        available,
        isLowStock
      };
    });

    return { report, lowStockAlerts };
  }
}

module.exports = new StockService();
