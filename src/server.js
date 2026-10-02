const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
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