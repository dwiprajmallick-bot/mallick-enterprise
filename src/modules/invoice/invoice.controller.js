const invoiceService = require('./invoice.service');

exports.handleCreateInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body);
    res.status(201).json({ success: true, message: 'Invoice generated successfully', data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.handleGetInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};
