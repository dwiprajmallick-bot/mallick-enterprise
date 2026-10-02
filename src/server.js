const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
// Intercept HTML output and strip Admin Panel and Orders from customer storefront
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    const origSend = res.send;
    res.send = function (data) {
      if (typeof data === 'string') {
        data = data.replace(/<[^>]*>Admin\s*Panel<\/[^>]*>/gi, '');
        data = data.replace(/<[^>]*>Orders<\/[^>]*>/gi, '');
        data = data.replace(/<a[^>]*href=["'][^"']*(admin|orders)[^"']*["'][^>]*>.*?<\/a>/gi, '');
        data = data.replace(/<\/head>/i, '<style>header a[href*="admin"], header a[href*="orders"], a:has-text("Admin Panel"), a:has-text("Orders") { display: none !important; }</style></head>');
      }
      return origSend.call(this, data);
    };
  }
  next();
});
app.use(express.urlencoded({ extended: true }));

// ১. স্ট্যাটিক ফোল্ডার
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// ২. হোম পেজ
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// ৩. এডমিন রাউট (সবগুলো ভ্যারিয়েন্ট)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(publicDir, 'admin.html'));
});

// ৪. এপিআই রাউটস (যদি থাকে)
try {
    const apiRoutes = require('./routes/api.routes');
    app.use('/api', apiRoutes);
} catch (e) {
    console.log("No extra API routes loaded");
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
