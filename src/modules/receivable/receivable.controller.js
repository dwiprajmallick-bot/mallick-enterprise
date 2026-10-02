const receivableService = require('./receivable.service');

exports.handleRecordPayment = async (req, res) => {
  try {
    const payment = await receivableService.recordPayment(req.body);
    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.handleGetOutstanding = async (req, res) => {
  try {
    const summary = await receivableService.getCustomerOutstanding(req.params.customerId);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
