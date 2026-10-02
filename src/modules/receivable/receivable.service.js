const CustomerPayment = require('./receivable.model');
const Invoice = require('../invoice/invoice.model');

class ReceivableService {
  async generateReceiptNumber() {
    const year = new Date().getFullYear();
    const count = await CustomerPayment.countDocuments();
    const sequence = String(count + 1).padStart(4, '0');
    return `REC-${year}-${sequence}`;
  }

  async recordPayment(data) {
    const { customerId, amountReceived, paymentMode, transactionRef, invoiceAllocations, remarks, recordedBy } = data;

    if (amountReceived <= 0) {
      throw new Error('Amount received must be greater than zero');
    }

    let remainingPayment = amountReceived;
    const allocations = [];

    if (invoiceAllocations && Array.isArray(invoiceAllocations)) {
      for (const item of invoiceAllocations) {
        if (remainingPayment <= 0) break;

        const invoice = await Invoice.findById(item.invoiceId);
        if (!invoice) continue;

        const allocationAmount = Math.min(item.amount, remainingPayment);

        allocations.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          allocatedAmount: allocationAmount
        });

        remainingPayment -= allocationAmount;

        if (allocationAmount >= invoice.grandTotal) {
          invoice.status = 'PAID';
          await invoice.save();
        }
      }
    }

    const receiptNumber = await this.generateReceiptNumber();

    const payment = new CustomerPayment({
      paymentReceiptNumber: receiptNumber,
      customerId,
      amountReceived,
      paymentMode: paymentMode || 'BANK_TRANSFER',
      transactionRef: transactionRef || '',
      allocations,
      unallocatedAmount: remainingPayment,
      remarks: remarks || '',
      recordedBy: recordedBy || 'SYSTEM'
    });

    await payment.save();
    return payment;
  }

  async getCustomerOutstanding(customerId) {
    const invoices = await Invoice.find({ customerId, status: { $ne: 'PAID' } });
    const payments = await CustomerPayment.find({ customerId });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalAllocated = payments.reduce((sum, p) => {
      return sum + p.allocations.reduce((inner, a) => inner + a.allocatedAmount, 0);
    }, 0);

    const outstandingBalance = totalInvoiced - totalAllocated;

    return {
      customerId,
      unpaidInvoicesCount: invoices.length,
      totalInvoiced,
      totalAllocated,
      outstandingBalance: Math.max(0, outstandingBalance)
    };
  }
}

module.exports = new ReceivableService();
