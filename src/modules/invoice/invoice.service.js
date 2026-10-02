const Invoice = require('./invoice.model');
const stockService = require('../stock/stock.service');

class InvoiceService {
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments();
    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}-${sequence}`;
  }

  async createInvoice(data) {
    const { orderId, customerId, customerGstin, customerStateCode, items, performedBy } = data;

    const sellerStateCode = process.env.SELLER_STATE_CODE || '19';
    const isInterState = sellerStateCode !== customerStateCode;

    let subTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const processedItems = items.map(item => {
      const taxable = item.quantity * item.unitPrice;
      const rate = item.taxRate || 18;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = (taxable * rate) / 100;
      } else {
        cgst = (taxable * (rate / 2)) / 100;
        sgst = (taxable * (rate / 2)) / 100;
      }

      const itemTotal = taxable + cgst + sgst + igst;

      subTotal += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      return {
        ...item,
        taxableAmount: taxable,
        cgst,
        sgst,
        igst,
        totalAmount: itemTotal
      };
    });

    const grandTotal = Math.round(subTotal + totalCgst + totalSgst + totalIgst);
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = new Invoice({
      invoiceNumber,
      orderId,
      customerId,
      customerGstin,
      customerStateCode,
      sellerStateCode,
      items: processedItems,
      subTotal,
      totalCgst,
      totalSgst,
      totalIgst,
      grandTotal,
      createdBy: performedBy || 'SYSTEM',
      paymentDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });

    await invoice.save();

    for (const item of items) {
      await stockService.confirmDispatch({
        productId: item.productId,
        quantity: item.quantity,
        invoiceId: invoice.invoiceNumber,
        performedBy: performedBy || 'SYSTEM'
      });
    }

    return invoice;
  }

  async getInvoiceById(id) {
    const invoice = await Invoice.findById(id).populate('customerId', 'name phone email address');
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }
}

module.exports = new InvoiceService();
