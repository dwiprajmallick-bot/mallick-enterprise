const stockService = require('./stock.service');

exports.handleStockIn = async (req, res) => {
  try {
    const result = await stockService.stockIn(req.body);
    res.status(200).json({ success: true, message: 'Stock added successfully', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.handleReserve = async (req, res) => {
  try {
    const result = await stockService.reserveStock(req.body);
    res.status(200).json({ success: true, message: 'Stock reserved successfully', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.handleDispatch = async (req, res) => {
  try {
    const result = await stockService.confirmDispatch(req.body);
    res.status(200).json({ success: true, message: 'Stock dispatched successfully', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.handleAdjustment = async (req, res) => {
  try {
    const result = await stockService.adjustStock(req.body);
    res.status(200).json({ success: true, message: 'Stock adjusted successfully', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getStockOverview = async (req, res) => {
  try {
    const data = await stockService.getStockStatus();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
