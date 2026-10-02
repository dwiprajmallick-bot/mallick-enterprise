const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ১. পাবলিক ফোল্ডারকে স্ট্যাটিক ডিরেক্টরি হিসেবে হোস্ট করা
app.use(express.static(path.join(__dirname, '../public')));

// ২. হেলথ চেক রুট
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'OfficeKart backend is running' });
});

// ৩. API রুটসমূহ
app.use('/api', apiRoutes);

// ৪. ক্যাচ-অল ফ্রন্টএন্ড মিডলওয়্যার (নতুন Express / path-to-regexp এর সাথে সম্পূর্ণ সামঞ্জস্যপূর্ণ)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

module.exports = app;
