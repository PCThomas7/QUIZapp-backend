// server.js - Main Express server file

const express = require('express');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');
// const csv = require('fast-csv');
// const xlsx = require('xlsx');
// const nodemailer = require('nodemailer');
// const multer = require('multer');
// const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const googleClient = new OAuth2Client(CLIENT_ID);

// Middleware
// Replace or update your existing CORS configuration
app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
app.use(express.json());




// Email transporter



app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/users', require('./routes/userRoutes'));  
app.use('/api/export', require('./routes/getCsvRoutes'));
app.use('/api/invitations', require('./routes/invitation'));
app.use('/api/email', require('./routes/sendMailRoutes'));

// Routes

app.get('/', (req, res) => {
    res.send('API running');
  });






// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});