import express from 'express';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import middlewares
import { authenticate, authorizeRoles } from './middleware/authMiddleWare.js';
import  checkCourseAccess  from './middleware/courseMiddleWare.js';

// Import database models
import { 
    Course, 
    Transaction, 
    Enrollment, 
    Quiz
} from './db/db.js';

// Import utilities and scripts
import { upload } from './utilits/fileupload.js';
import initializeTags from './scripts/initTags.js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const googleClient = new OAuth2Client(CLIENT_ID);

// CORS Configuration
const allowedOrigins = [
    'https://quizapp-fe.vercel.app',
    'https://qui-zapp-backend.vercel.app/',
    'http://localhost:5173',
    'http://localhost:3000'
];

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Import routes
import authRoutes from './routes/authRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import userRoutes from './routes/userRoutes.js';
import exportRoutes from './routes/getCsvRoutes.js';
import invitationRoutes from './routes/invitation.js';
import emailRoutes from './routes/sendMailRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import chapterRoutes from './routes/chapterRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import tagRoutes from './routes/TagRoutes.js';
import QuizRoutes from './routes/QuizRoutes.js';
import studentRoutes from './routes/studentRoutes.js';


// Increase payload size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));



// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/quizzes', QuizRoutes);
// Add student routes
app.use('/api/student', authenticate, authorizeRoles('Student'), studentRoutes);


// Base route
app.get('/', (req, res) => {
    res.send('API running');
});

// Payment verification route
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

// Database connection
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    initializeTags()
        .then(() => console.log('Tags initialized'))
        .catch(console.error);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


export default app;