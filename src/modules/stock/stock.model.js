const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true, 
    unique: true 
  },
  warehouseId: { 
    type: String, 
    default: 'MAIN_WAREHOUSE' 
  },
  onHandQuantity: { 
    type: Number, 
    required: true, 
    default: 0, 
    min: 0 
  },
  reservedQuantity: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  minAlertThreshold: { 
    type: Number, 
    default: 10 
  },
  costPrice: { 
    type: Number, 
    default: 0 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const stockMovementSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['GRN_RECEIPT', 'SALE_DISPATCH', 'RESERVATION', 'RELEASE_RESERVATION', 'STOCK_ADJUSTMENT'], 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  previousQuantity: { 
    type: Number, 
    required: true 
  },
  newQuantity: { 
    type: Number, 
    required: true 
  },
  referenceType: { 
    type: String, 
    enum: ['GRN', 'ORDER', 'INVOICE', 'MANUAL_AUDIT'] 
  },
  referenceId: { 
    type: String, 
    required: true 
  },
  remark: { 
    type: String 
  },
  performedBy: { 
    type: String, 
    default: 'SYSTEM' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const StockItem = mongoose.model('StockItem', stockItemSchema);
const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

module.exports = { StockItem, StockMovement };
