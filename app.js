// server.js - Main Express server file

const express = require('express');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');
const {authenticate, authorizeRoles} = require('./middleware/authMiddleWare');
const {Course, Section, Chapter, Lesson, BatchCourse, Enrollment} = require('./db/db');
const { upload } = require('./utilits/fileupload');
const { checkCourseAccess } = require('./middleware/courseMiddleWare');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const googleClient = new OAuth2Client(CLIENT_ID);

// Middleware
const allowedOrigins = [
    'https://quizapp-fe.vercel.app',
    'https://qui-zapp-backend.vercel.app/',
    'http://localhost:5173',
    'http://localhost:3000' // Add your local development frontend URL if needed
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/sections', require('./routes/sectionRoutes'));
app.use('/api/chapters', require('./routes/chapterRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));
// Routes

app.get('/', (req, res) => {
    res.send('API running');
  });

// Verify Razorpay payment
app.post('/payment/verify', authenticate, async (req, res) => {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      
      // Find transaction
      const transaction = await Transaction.findOne({ razorpayOrderId });
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Verify signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
        
      if (generatedSignature !== razorpaySignature) {
        transaction.status = 'failed';
        await transaction.save();
        
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
      
      // Update transaction
      transaction.razorpayPaymentId = razorpayPaymentId;
      transaction.razorpaySignature = razorpaySignature;
      transaction.status = 'captured';
      transaction.paymentId = razorpayPaymentId;
      await transaction.save();
      
      // Create enrollment
      const enrollment = new Enrollment({
        userId: transaction.userId,
        courseId: transaction.courseId,
        enrollmentType: 'paid',
        transactionId: transaction._id
      });
      
      await enrollment.save();
      
      // Increment enrolled count
      const course = await Course.findById(transaction.courseId);
      course.enrolledCount++;
      await course.save();
      
      res.json({
        message: 'Payment verified and enrollment successful',
        transaction,
        enrollment
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ message: 'Failed to verify payment' });
    }
  });



// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});