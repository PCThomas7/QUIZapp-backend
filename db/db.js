import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import Invitation from '../models/Invitation.js';
import Course from '../models/Course.js';
import Section from '../models/Section.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import BatchCourse from '../models/BatchCourse.js';
import Enrollment from '../models/Enrollment.js';
import Transaction from '../models/Transaction.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import ProgressTracking from '../models/ProgressTracking.js';
import QuestionBank from '../models/QuestionBank.js';
import TagSystem from '../models/TagSystem.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Export all models
export {
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