const Product = require('./product.model');

// সব সক্রিয় প্রোডাক্ট ফেচ করা
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// নতুন স্টেশনারি আইটেম যোগ করা
exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, message: 'প্রোডাক্ট সফলভাবে যুক্ত হয়েছে', data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// প্রোডাক্টের স্টক বা তথ্য আপডেট করা
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'প্রোডাক্ট পাওয়া যায়নি' });
    res.status(200).json({ success: true, message: 'আপডেট সম্পন্ন হয়েছে', data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
