const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('../models/User');
const Batch = require('../models/Batch');
const Invitation = require('../models/Invitation');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Chapter = require('../models/Chapter');
const Lesson = require('../models/Lesson');
const BatchCourse = require('../models/BatchCourse');
const Enrollment = require('../models/Enrollment');
const Transaction = require('../models/Transaction');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');
const ProgressTracking = require('../models/ProgressTracking');
const QuestionBank = require('../models/QuestionBank');
const TagSystem = require('../models/TagSystem');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Export all models
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
    ProgressTracking,
    QuestionBank,
    TagSystem
};