const mongoose = require('mongoose');
require('dotenv').config();



// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);



// Models
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true, unique: true },
    role: { 
      type: String, 
      enum: ['Super Admin', 'Admin', 'Mentor', 'Student'],
      default: 'Student'
    },
    status: { 
      type: String, 
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    joinDate: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    profilePicture: { type: String },
    batches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    }],
    batchSubscriptions: [{
      batch: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch' 
      },
      expiresOn: { type: Date }
    }]
  });
  
  const batchSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    active: { type: Boolean, default: true }
  });
  
  const invitationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['Super Admin', 'Admin', 'Mentor', 'Student'],
      default: 'Student'
    },
    batches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    }],
    batchSubscriptions: [{
      batch: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch' 
      },
      expiresOn: { type: Date }
    }],
    token: { type: String, required: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    status: { 
      type: String, 
      enum: ['Pending', 'Accepted', 'Expired'],
      default: 'Pending'
    }
  });
  const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    thumbnail: {
        type: String
    },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Archived'],
        default: 'Draft'
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    salePrice: {
        type: Number,
        min: 0
    },
    enableRazorpay: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    sections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section'
    }],
    totalLessons: {
        type: Number,
        default: 0
    },
    totalDuration: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for sections
courseSchema.virtual('courseSections', {
    ref: 'Section',
    localField: '_id',
    foreignField: 'courseId'
});

const sectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    }
  });
  
  const chapterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true
    }
  });
  
  const lessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['video', 'pdf', 'quiz'],
      required: true
    },
    provider: { 
      type: String, 
      enum: ['youtube', 'vimeo', null],
      default: null
    },
    duration: { type: String },
    content: { type: String, required: true },
    preview: { 
      type: Boolean, 
      default: false
    },
    order: { type: Number, required: true },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true
    }
  });
  
  const batchCourseSchema = new mongoose.Schema({
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  });
  
  const enrollmentSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    enrollmentType: {
      type: String,
      enum: ['free', 'paid', 'batch'],
      required: true
    },
    status: {
      type: String,
      enum: ['Active', 'Expired', 'Cancelled'],
      default: 'Active'
    },
    expiryDate: Date,
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  });
  
  const transactionSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    orderId: {
      type: String,
      required: true
    },
    razorpayOrderId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created'
    },
    paymentId: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  });
  
  const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    timeLimit: { type: Number }, // in minutes
    passingScore: { 
      type: Number,
      default: 70
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  });
  
  const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    questionType: { 
      type: String, 
      enum: ['multiple-choice', 'single-choice', 'true-false'],
      required: true
    },
    options: [{ type: String }],
    correctAnswers: [{ type: String }],
    score: { 
      type: Number,
      default: 1
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true
    }
  });
  
  const quizAttemptSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    score: { type: Number },
    passed: { type: Boolean },
    attemptDate: {
      type: Date,
      default: Date.now
    },
    timeTaken: { type: Number } // in seconds
  });
  
  const progressTrackingSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    progressPercentage: {
      type: Number,
      default: 0
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  });
  
  const Course = mongoose.model('Course', courseSchema);
  const Section = mongoose.model('Section', sectionSchema);
  const Chapter = mongoose.model('Chapter', chapterSchema);
  const Lesson = mongoose.model('Lesson', lessonSchema);
  const BatchCourse = mongoose.model('BatchCourse', batchCourseSchema);
  const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
  const Transaction = mongoose.model('Transaction', transactionSchema);
  const Quiz = mongoose.model('Quiz', quizSchema);
  const Question = mongoose.model('Question', questionSchema);
  const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
  const ProgressTracking = mongoose.model('ProgressTracking', progressTrackingSchema);
  
  const User = mongoose.model('User', userSchema);
  const Batch = mongoose.model('Batch', batchSchema);
  const Invitation = mongoose.model('Invitation', invitationSchema);


  module.exports = {
    User,
    Batch,
    Invitation,
    Course,
    Section,
    Chapter,
    Lesson,
    BatchCourse,
    Enrollment,
    Transaction,
    Quiz,
    Question,
    QuizAttempt,
    ProgressTracking

  };