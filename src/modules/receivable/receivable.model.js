const mongoose = require('mongoose');

const customerPaymentSchema = new mongoose.Schema({
  paymentReceiptNumber: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amountReceived: { type: Number, required: true, min: 1 },
  paymentMode: { 
    type: String, 
    enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'NEFT_RTGS'], 
    default: 'BANK_TRANSFER' 
  },
  transactionRef: { type: String, default: '' },
  receivedDate: { type: Date, default: Date.now },
  allocations: [{
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    invoiceNumber: { type: String, required: true },
    allocatedAmount: { type: Number, required: true }
  }],
  unallocatedAmount: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  recordedBy: { type: String, default: 'SYSTEM' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);
