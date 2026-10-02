const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['paper', 'pen', 'folder', 'desk', 'other'],
    default: 'other' 
  },
  price: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'Piece' }, // Piece, Box, Rim, Packet
  hsnCode: { type: String, default: '9983' },
  taxRate: { type: Number, default: 18 },
  imageUrl: { type: String, default: 'https://placehold.co/300x200?text=Stationery' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
