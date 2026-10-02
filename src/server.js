import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// সিকিউরিটি হেডার্স ও রেট লিমিট
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Atlas কানেকশন
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/officekart';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'officekart@123'; // ডিফল্ট অ্যাডমিন পাসওয়ার্ড

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  tls: true
})
  .then(() => console.log('✅ MongoDB Atlas Cloud connected securely.'))
  .catch(err => console.error('⚠️ MongoDB connection error:', err.message));

// ১. প্রোডাক্ট স্কিমা
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'other' },
  unit: { type: String, default: 'Piece' },
  price: { type: Number, required: true },
  stockQuantity: { type: Number, default: 0 },
  hsnCode: { type: String, default: '9983' },
  taxRate: { type: Number, default: 18 },
  imageUrl: { type: String }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// ২. অর্ডার স্কিমা
const orderSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  customer: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    gstin: { type: String, trim: true }
  },
  items: [{
    productId: { type: String },
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number }
  }],
  total: { type: Number, required: true },
  paymentMethod: { type: String, default: 'COD' },
  transactionId: { type: String, default: 'N/A' },
  status: { type: String, default: 'PENDING' }
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// অ্যাডমিন অথেন্টিকেশন গার্ড
const requireAdmin = (req, res, next) => {
  const token = req.headers['x-admin-key'] || req.query.adminKey;
  if (!token || token !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'অ্যাক্সেস ডিনায়েড: অ্যাডমিন পাসওয়ার্ড আবশ্যক।' });
  }
  next();
};

// --- পাবলিক API ---

// অ্যাডমিন পাসওয়ার্ড ভেরিফাই করা
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_SECRET) {
    res.json({ success: true, message: 'সফলভাবে লগইন হয়েছে।' });
  } else {
    res.status(401).json({ success: false, message: 'ভুল পাসওয়ার্ড!' });
  }
});

// ক্যাটালগ
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch catalog.' });
  }
});

// কাস্টমার অর্ডার সাবমিট (সরাসরি স্টক রিডাকশন)
app.post('/api/orders', async (req, res) => {
  try {
    const { invoiceNumber, customer, items, total, paymentMethod, transactionId } = req.body;
    
    if (!customer?.name || !customer?.phone || !customer?.address) {
      return res.status(400).json({ success: false, message: 'গ্রাহকের সম্পূর্ণ তথ্য প্রদান করুন।' });
    }

    const newOrder = new Order({
      invoiceNumber,
      customer,
      items,
      total,
      paymentMethod,
      transactionId: transactionId || 'N/A',
      status: 'PENDING'
    });

    await newOrder.save();

    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stockQuantity: -item.quantity }
          });
        }
      }
    }

    res.json({ success: true, data: { invoiceNumber: newOrder.invoiceNumber } });
  } catch (err) {
    res.status(400).json({ success: false, message: 'অর্ডার সংরক্ষণ করা সম্ভব হয়নি।' });
  }
});

// --- অ্যাডমিন সুরক্ষিত API (যেকোনো বাইরের এক্সেস ব্লক) ---

// সম্পূর্ণ কাস্টমার ও অর্ডার লিস্ট (পাসওয়ার্ড ছাড়া অ্যাক্সেস হবে না)
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'ডেটা অ্যাক্সেস ব্যর্থ হয়েছে।' });
  }
});

// প্রোডাক্ট অ্যাড
app.post('/api/products/add', requireAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: 'প্রোডাক্ট সংরক্ষণ ব্যর্থ হয়েছে।' });
  }
});

// স্টক আপডেট
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { stockQuantity: req.body.stockQuantity },
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: 'স্টক আপডেট ব্যর্থ।' });
  }
});

// ডিসপ্যাচ স্ট্যাটাস আপডেট
app.put('/api/orders/:invoiceNumber/status', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { invoiceNumber: req.params.invoiceNumber },
      { status: req.body.status },
      { new: true }
    );
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: 'স্ট্যাটাস আপডেট ব্যর্থ।' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`OfficeKart Secure Server: http://localhost:${PORT}`);
  console.log(`Admin Secret Password: officekart@123`);
  console.log(`==================================================`);
});

