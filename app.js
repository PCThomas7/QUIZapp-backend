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

// Routes

app.get('/', (req, res) => {
    res.send('API running');
  });


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});