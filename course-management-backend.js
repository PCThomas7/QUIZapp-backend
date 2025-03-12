// course-management.js - Course management related routes and models

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// File upload configuration for course thumbnails and PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'thumbnail') {
      uploadPath += 'thumbnails/';
    } else if (file.fieldname === 'pdfContent') {
      uploadPath += 'pdfs/';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'thumbnail') {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'), false);
    }
  } else if (file.fieldname === 'pdfContent') {
    // Accept only PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for lesson content'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Models

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String },
  status: { 
    type: String, 
    enum: ['Draft', 'Published'],
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
  enrolledCount: { 
    type: Number, 
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  enableRazorpay: {
    type: Boolean,
    default: true
  }
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
  enrolledDate: {
    type: Date,
    default: Date.now
  },
  enrollmentType: {
    type: String,
    enum: ['paid', 'batch', 'free'],
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  expiryDate: {
    type: Date
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
    ref: 'Course'
  },
  paymentId: { type: String },
  orderId: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
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
    enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
    default: 'created'
  },
  timestamp: {
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

// Middleware for checking course access
const checkCourseAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Admin and course creator always have access
    if (req.user.role === 'Super Admin' || req.user.role === 'Admin' || 
        course.createdBy.toString() === userId.toString()) {
      req.course = course;
      return next();
    }
    
    // Check if the user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      userId,
      courseId
    });
    
    if (enrollment) {
      // Check if enrollment has expired
      if (enrollment.expiryDate && new Date() > enrollment.expiryDate) {
        return res.status(403).json({ message: 'Your enrollment has expired' });
      }
      
      req.course = course;
      req.enrollment = enrollment;
      return next();
    }
    
    // Check if user has batch access
    const userBatches = req.user.batches || [];
    
    const batchAccess = await BatchCourse.findOne({
      courseId,
      batchId: { $in: userBatches }
    });
    
    if (batchAccess) {
      // Check if batch access has subscription expiry
      const batchSubscription = req.user.batchSubscriptions.find(
        sub => userBatches.some(b => b.toString() === sub.batch.toString())
      );
      
      if (batchSubscription && batchSubscription.expiresOn && new Date() > batchSubscription.expiresOn) {
        return res.status(403).json({ message: 'Your batch subscription has expired' });
      }
      
      req.course = course;
      return next();
    }
    
    // No access, but allow preview content
    req.course = course;
    req.previewOnly = true;
    return next();
  } catch (error) {
    console.error('Error checking course access:', error);
    res.status(500).json({ message: 'Failed to check course access' });
  }
};

// Course CRUD routes

// Get all courses
router.get('/courses', async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // If not admin, show only published courses for general listing
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      query.status = 'Published';
    }
    
    const courses = await Course.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Create a new course
router.post('/courses', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, description, status, price, salePrice, enableRazorpay } = req.body;
    
    const course = new Course({
      title,
      description,
      status: status || 'Draft',
      price: price || 0,
      salePrice: salePrice || undefined,
      createdBy: req.user._id,
      enableRazorpay: enableRazorpay === 'true'
    });
    
    if (req.file) {
      course.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }
    
    await course.save();
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
});


// Get a single course with its full structure
router.get('/courses/:courseId', authenticate, checkCourseAccess, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Get the course
    const course = await Course.findById(courseId)
      .populate('createdBy', 'name email');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get all sections
    const sections = await Section.find({ courseId })
      .sort({ order: 1 });
    
    // Get all chapters for these sections
    const sectionIds = sections.map(section => section._id);
    const chapters = await Chapter.find({ sectionId: { $in: sectionIds } })
      .sort({ order: 1 });
    
    // Get all lessons for these chapters
    const chapterIds = chapters.map(chapter => chapter._id);
    const lessons = await Lesson.find({ chapterId: { $in: chapterIds } })
      .sort({ order: 1 });
    
    // Get batch assignments
    const batchAssignments = await BatchCourse.find({ courseId })
      .populate('batchId', 'name');
      
    // Build full course structure
    const courseStructure = {
      ...course.toObject(),
      sections: sections.map(section => ({
        ...section.toObject(),
        chapters: chapters
          .filter(chapter => chapter.sectionId.toString() === section._id.toString())
          .map(chapter => ({
            ...chapter.toObject(),
            lessons: lessons
              .filter(lesson => lesson.chapterId.toString() === chapter._id.toString())
              .map(lesson => {
                // If preview only access, filter out non-preview lessons
                if (req.previewOnly && !lesson.preview) {
                  return {
                    ...lesson.toObject(),
                    content: null, // Don't send content for non-preview lessons
                    isLocked: true
                  };
                }
                return {
                  ...lesson.toObject(),
                  isLocked: false
                };
              })
          }))
      })),
      assignedBatches: batchAssignments.map(assignment => assignment.batchId),
      userAccess: {
        hasFullAccess: !req.previewOnly,
        enrollmentType: req.enrollment ? req.enrollment.enrollmentType : null,
        expiryDate: req.enrollment ? req.enrollment.expiryDate : null
      }
    };
    
    res.json(courseStructure);
  } catch (error) {
    console.error('Error fetching course structure:', error);
    res.status(500).json({ message: 'Failed to fetch course structure' });
  }
});

// Update a course
router.put('/courses/:courseId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), upload.single('thumbnail'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, status, price, salePrice, enableRazorpay } = req.body;
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if user is authorized to edit this course
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this course' });
    }
    
    // Update course fields
    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (status) course.status = status;
    if (price !== undefined) course.price = price;
    if (salePrice !== undefined) course.salePrice = salePrice || null;
    if (enableRazorpay !== undefined) course.enableRazorpay = enableRazorpay === 'true';
    
    // Update thumbnail if provided
    if (req.file) {
      // Delete old thumbnail if it exists
      if (course.thumbnail) {
        const oldPath = path.join(__dirname, '..', course.thumbnail);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      course.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }
    
    await course.save();
    
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
});

// Delete a course
router.delete('/courses/:courseId', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if there are enrollments for this course
    const enrollmentCount = await Enrollment.countDocuments({ courseId });
    
    if (enrollmentCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete course with existing enrollments',
        enrollmentCount
      });
    }
    
    // Delete all lessons, chapters, and sections
    const sections = await Section.find({ courseId });
    const sectionIds = sections.map(section => section._id);
    
    const chapters = await Chapter.find({ sectionId: { $in: sectionIds } });
    const chapterIds = chapters.map(chapter => chapter._id);
    
    const lessons = await Lesson.find({ chapterId: { $in: chapterIds } });
    
    // Delete lesson files (PDFs)
    for (const lesson of lessons) {
      if (lesson.type === 'pdf' && lesson.content) {
        const pdfPath = path.join(__dirname, '..', 'uploads', 'pdfs', path.basename(lesson.content));
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }
    }
    
    // Delete thumbnail
    if (course.thumbnail) {
      const thumbnailPath = path.join(__dirname, '..', course.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }
    
    // Delete all related documents
    await Promise.all([
      Lesson.deleteMany({ chapterId: { $in: chapterIds } }),
      Chapter.deleteMany({ sectionId: { $in: sectionIds } }),
      Section.deleteMany({ courseId }),
      BatchCourse.deleteMany({ courseId }),
      Course.findByIdAndDelete(courseId)
    ]);
    
    res.json({ message: 'Course and all related content deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

// Section CRUD routes
router.post('/courses/:courseId/sections', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, order } = req.body;
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if user is authorized to edit this course
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this course' });
    }
    
    // Get the max order if not provided
    let sectionOrder = order;
    if (!sectionOrder) {
      const lastSection = await Section.findOne({ courseId })
        .sort({ order: -1 });
      
      sectionOrder = lastSection ? lastSection.order + 1 : 1;
    }
    
    const section = new Section({
      title,
      description,
      order: sectionOrder,
      courseId
    });
    
    await section.save();
    
    res.status(201).json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ message: 'Failed to create section' });
  }
});

// Update a section
router.put('/sections/:sectionId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { title, description, order } = req.body;
    
    const section = await Section.findById(sectionId);
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Check if user is authorized
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this section' });
    }
    
    // Update section fields
    if (title) section.title = title;
    if (description !== undefined) section.description = description;
    if (order) section.order = order;
    
    await section.save();
    
    res.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ message: 'Failed to update section' });
  }
});

// Delete a section
router.delete('/sections/:sectionId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const section = await Section.findById(sectionId);
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Check if user is authorized
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this section' });
    }
    
    // Delete all chapters and lessons in this section
    const chapters = await Chapter.find({ sectionId });
    const chapterIds = chapters.map(chapter => chapter._id);
    
    // Delete associated lessons
    await Lesson.deleteMany({ chapterId: { $in: chapterIds } });
    
    // Delete chapters
    await Chapter.deleteMany({ sectionId });
    
    // Delete section
    await Section.findByIdAndDelete(sectionId);
    
    res.json({ message: 'Section and all related content deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ message: 'Failed to delete section' });
  }
});

// Chapter CRUD routes
router.post('/sections/:sectionId/chapters', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { title, description, order } = req.body;
    
    const section = await Section.findById(sectionId);
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Check if user is authorized
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this section' });
    }
    
    // Get the max order if not provided
    let chapterOrder = order;
    if (!chapterOrder) {
      const lastChapter = await Chapter.findOne({ sectionId })
        .sort({ order: -1 });
      
      chapterOrder = lastChapter ? lastChapter.order + 1 : 1;
    }
    
    const chapter = new Chapter({
      title,
      description,
      order: chapterOrder,
      sectionId
    });
    
    await chapter.save();
    
    res.status(201).json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ message: 'Failed to create chapter' });
  }
});

// Update a chapter
router.put('/chapters/:chapterId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { title, description, order } = req.body;
    
    const chapter = await Chapter.findById(chapterId);
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    
    // Check if user is authorized
    const section = await Section.findById(chapter.sectionId);
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this chapter' });
    }
    
    // Update chapter fields
    if (title) chapter.title = title;
    if (description !== undefined) chapter.description = description;
    if (order) chapter.order = order;
    
    await chapter.save();
    
    res.json(chapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ message: 'Failed to update chapter' });
  }
});

// Delete a chapter
router.delete('/chapters/:chapterId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { chapterId } = req.params;
    
    const chapter = await Chapter.findById(chapterId);
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    
    // Check if user is authorized
    const section = await Section.findById(chapter.sectionId);
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this chapter' });
    }
    
    // Delete all lessons in this chapter
    await Lesson.deleteMany({ chapterId });
    
    // Delete chapter
    await Chapter.findByIdAndDelete(chapterId);
    
    res.json({ message: 'Chapter and all related lessons deleted successfully' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ message: 'Failed to delete chapter' });
  }
});

// Lesson CRUD routes
router.post('/chapters/:chapterId/lessons', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), upload.single('pdfContent'), async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { title, type, provider, duration, content, preview, order } = req.body;
    
    const chapter = await Chapter.findById(chapterId);
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    
    // Check authorization
    const section = await Section.findById(chapter.sectionId);
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this chapter' });
    }
    
    // Get the max order if not provided
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await Lesson.findOne({ chapterId })
        .sort({ order: -1 });
      
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }
    
    // Create lesson
    const lesson = new Lesson({
      title,
      type,
      duration,
      preview: preview === 'true',
      order: lessonOrder,
      chapterId
    });
    
    // Set content based on lesson type
    if (type === 'video') {
      lesson.provider = provider;
      lesson.content = content;
    } else if (type === 'pdf') {
      if (!req.file) {
        return res.status(400).json({ message: 'PDF file is required for PDF lesson type' });
      }
      
      lesson.content = `/uploads/pdfs/${req.file.filename}`;
    } else if (type === 'quiz') {
      const quiz = await Quiz.findById(content);
      
      if (!quiz) {
        return res.status(400).json({ message: 'Invalid quiz ID' });
      }
      
      lesson.content = content;
    }
    
    await lesson.save();
    
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ message: 'Failed to create lesson' });
  }
});

// Update a lesson
router.put('/lessons/:lessonId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), upload.single('pdfContent'), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, type, provider, duration, content, preview, order } = req.body;
    
    const lesson = await Lesson.findById(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Check authorization
    const chapter = await Chapter.findById(lesson.chapterId);
    const section = await Section.findById(chapter.sectionId);
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this lesson' });
    }
    
    // Update lesson fields
    if (title) lesson.title = title;
    if (duration) lesson.duration = duration;
    if (preview !== undefined) lesson.preview = preview === 'true';
    if (order) lesson.order = order;
    
    // Update content if type is changed or content is provided
    if (type && type !== lesson.type) {
      lesson.type = type;
      
      // Reset content when changing types
      if (type === 'video') {
        lesson.provider = provider || 'youtube';
        lesson.content = content || '';
      } else if (type === 'quiz') {
        const quiz = await Quiz.findById(content);
        
        if (!quiz) {
          return res.status(400).json({ message: 'Invalid quiz ID' });
        }
        
        lesson.provider = null;
        lesson.content = content;
      }
    } else {
      // Update content without changing type
      if (type === 'video') {
        if (provider) lesson.provider = provider;
        if (content) lesson.content = content;
      } else if (type === 'quiz' && content) {
        const quiz = await Quiz.findById(content);
        
        if (!quiz) {
          return res.status(400).json({ message: 'Invalid quiz ID' });
        }
        
        lesson.content = content;
      }
    }
    
    // Handle PDF upload if needed
    if (lesson.type === 'pdf' && req.file) {
      // Delete old PDF if exists
      if (lesson.content) {
        const oldPath = path.join(__dirname, '..', lesson.content);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      lesson.content = `/uploads/pdfs/${req.file.filename}`;
    }
    
    await lesson.save();
    
    res.json(lesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ message: 'Failed to update lesson' });
  }
});

// Delete a lesson
router.delete('/lessons/:lessonId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    const lesson = await Lesson.findById(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Check authorization
    const chapter = await Chapter.findById(lesson.chapterId);
    const section = await Section.findById(chapter.sectionId);
    const course = await Course.findById(section.courseId);
    
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this lesson' });
    }
    
    // Delete PDF file if it's a PDF lesson
    if (lesson.type === 'pdf' && lesson.content) {
      const pdfPath = path.join(__dirname, '..', lesson.content);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }
    
    // Delete lesson
    await Lesson.findByIdAndDelete(lessonId);
    
    // Delete progress tracking for this lesson
    await ProgressTracking.deleteMany({ lessonId });
    
    // Delete quiz attempts for this lesson
    await QuizAttempt.deleteMany({ lessonId });
    
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ message: 'Failed to delete lesson' });
  }
});

// Batch assignment routes
router.post('/courses/:courseId/batches', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { batchIds } = req.body;
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Clear existing batch assignments
    await BatchCourse.deleteMany({ courseId });
    
    // Create new batch assignments
    const batchAssignments = [];
    
    for (const batchId of batchIds) {
      const batch = await Batch.findById(batchId);
      
      if (!batch) {
        continue; // Skip invalid batch IDs
      }
      
      const batchCourse = new BatchCourse({
        batchId,
        courseId,
        assignedDate: new Date()
      });
      
      await batchCourse.save();
      batchAssignments.push(batchCourse);
    }
    
    res.json({ 
      message: 'Batch assignments updated successfully',
      batchAssignments
    });
  } catch (error) {
    console.error('Error assigning batches:', error);
    res.status(500).json({ message: 'Failed to assign batches' });
  }
});

// Enrollment and payment routes
router.post('/courses/:courseId/enroll', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    if (course.status !== 'Published') {
      return res.status(400).json({ message: 'Course is not published' });
    }
    
    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId
    });
    
    if (existingEnrollment) {
      return res.status(400).json({ message: 'You are already enrolled in this course' });
    }
    
    // Check if user has batch access
    const userBatches = req.user.batches || [];
    
    const batchAccess = await BatchCourse.findOne({
      courseId,
      batchId: { $in: userBatches }
    });
    
    if (batchAccess) {
      // Enroll via batch access
      const enrollment = new Enrollment({
        userId: req.user._id,
        courseId,
        enrollmentType: 'batch'
      });
      
      // Set expiry date if batch subscription has an expiry
      const batchSubscription = req.user.batchSubscriptions.find(
        sub => userBatches.some(b => b.toString() === sub.batch.toString())
      );
      
      if (batchSubscription && batchSubscription.expiresOn) {
        enrollment.expiryDate = batchSubscription.expiresOn;
      }
      
      await enrollment.save();
      
      // Increment enrolled count
      course.enrolledCount++;
      await course.save();
      
      return res.status(201).json({
        message: 'Enrolled successfully via batch access',
        enrollment
      });
    }
    
    // Check if course is free
    if (course.price === 0) {
      // Free enrollment
      const enrollment = new Enrollment({
        userId: req.user._id,
        courseId,
        enrollmentType: 'free'
      });
      
      await enrollment.save();
      
      // Increment enrolled count
      course.enrolledCount++;
      await course.save();
      
      return res.status(201).json({
        message: 'Enrolled successfully in free course',
        enrollment
      });
    }
    
    // For paid courses, create Razorpay order
    if (!course.enableRazorpay) {
      return res.status(400).json({ message: 'Payment is not enabled for this course' });
    }
    
    // Use sale price if available, otherwise use regular price
    const amount = (course.salePrice || course.price) * 100; // Convert to paise
    
    const options = {
      amount,
      currency: 'INR',
      receipt: `course_${courseId}_user_${req.user._id}`,
      payment_capture: 1
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    
    // Create transaction record
    const transaction = new Transaction({
      userId: req.user._id,
      courseId,
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: amount / 100, // Convert back to rupees for storage
      currency: 'INR',
      status: 'created'
    });
    
    await transaction.save();
    
    res.json({
      message: 'Payment order created',
      order: razorpayOrder,
      transaction
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ message: 'Failed to enroll in course' });
  }
});

// Verify Razorpay payment
router.post('/payment/verify', authenticate, async (req, res) => {
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

// Progress tracking routes
router.post('/lessons/:lessonId/progress', authenticate, checkCourseAccess, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { completed, progressPercentage } = req.body;
    
    if (req.previewOnly && !req.lesson.preview) {
      return res.status(403).json({ message: 'You need to enroll in this course to track progress' });
    }
    
    // Get lesson
    const lesson = await Lesson.findById(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Get chapter and section to find courseId
    const chapter = await Chapter.findById(lesson.chapterId);
    const section = await Section.findById(chapter.sectionId);
    
    // Find existing progress or create new
    let progress = await ProgressTracking.findOne({
      userId: req.user._id,
      courseId: section.courseId,
      lessonId
    });
    
    if (!progress) {
      progress = new ProgressTracking({
        userId: req.user._id,
        courseId: section.courseId,
        lessonId,
        completed: completed || false,
        progressPercentage: progressPercentage || 0,
        lastAccessed: new Date()
      });
    } else {
      progress.lastAccessed = new Date();
      
      if (completed !== undefined) {
        progress.completed = completed;
      }
      
      if (progressPercentage !== undefined) {
        progress.progressPercentage = progressPercentage;
      }
    }
    
    await progress.save();
    
    res.json(progress);
  } catch (error) {
    console.error('Error tracking progress:', error);
    res.status(500).json({ message: 'Failed to track progress' });
  }
});

// Get course progress
router.get('/courses/:courseId/progress', authenticate, checkCourseAccess, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    if (req.previewOnly) {
      return res.status(403).json({ message: 'You need to enroll in this course to view progress' });
    }
    
    // Get all progress records for this course and user
    const progress = await ProgressTracking.find({
      userId: req.user._id,
      courseId
    });
    
    // Get all lessons for this course to calculate overall progress
    const sections = await Section.find({ courseId });
    const sectionIds = sections.map(section => section._id);
    
    const chapters = await Chapter.find({ sectionId: { $in: sectionIds } });
    const chapterIds = chapters.map(chapter => chapter._id);
    
    const lessons = await Lesson.find({ chapterId: { $in: chapterIds } });
    
    // Calculate overall progress
    const totalLessons = lessons.length;
    const completedLessons = progress.filter(p => p.completed).length;
    
    const overallProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;
    
    res.json({
      progress,
      overallProgress,
      totalLessons,
      completedLessons
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
});

// Quiz routes
router.post('/quizzes', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { title, description, timeLimit, passingScore } = req.body;
    
    const quiz = new Quiz({
      title,
      description,
      timeLimit: timeLimit || 0,
      passingScore: passingScore || 70,
      createdBy: req.user._id
    });
    
    await quiz.save();
    
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'Failed to create quiz' });
  }
});

router.post('/quizzes/:quizId/questions', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
  try {
    const { quizId } = req.params;
    const { question, questionType, options, correctAnswers, score } = req.body;
    
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Check if user is authorized to edit this quiz
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
        quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this quiz' });
    }
    
    const newQuestion = new Question({
      question,
      questionType,
      options: options || [],
      correctAnswers: correctAnswers || [],
      score: score || 1,
      quizId
    });
    
    await newQuestion.save();
    
    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ message: 'Failed to add question' });
  }
});

router.post('/quizzes/:quizId/attempt', authenticate, checkCourseAccess, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { lessonId, answers, timeTaken } = req.body;
    
    // Get quiz
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Get questions
    const questions = await Question.find({ quizId });
    
    // Score the quiz
    let totalScore = 0;
    let maxScore = 0;
    
    for (const question of questions) {
      maxScore += question.score;
      
      const userAnswer = answers.find(a => a.questionId === question._id.toString());
      
      if (!userAnswer) continue;
      
      // Check if answer is correct
      if (question.questionType === 'multiple-choice') {
        // For multiple choice, all correct options must be selected and no incorrect ones
        const userAnswers = Array.isArray(userAnswer.answer) ? userAnswer.answer : [userAnswer.answer];
        const correctAnswers = question.correctAnswers;
        
        // Check if arrays have the same elements (order doesn't matter)
        const isCorrect = userAnswers.length === correctAnswers.length && 
          userAnswers.every(ans => correctAnswers.includes(ans));
        
        if (isCorrect) {
          totalScore += question.score;
        }
      } else if (question.questionType === 'single-choice' || question.questionType === 'true-false') {
        // For single choice, just check if the answer matches
        if (question.correctAnswers.includes(userAnswer.answer)) {
          totalScore += question.score;
        }
      }
    }
    
    // Calculate percentage score
    const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    // Check if passed
    const passed = percentageScore >= quiz.passingScore;
    
    // Create quiz attempt record
    const attempt = new QuizAttempt({
      userId: req.user._id,
      quizId,
      lessonId,
      score: percentageScore,
      passed,
      timeTaken: timeTaken || 0
    });
    
    await attempt.save();
    
    // If passing, mark lesson as completed
    if (passed && lessonId) {
      // Get lesson to find course
      const lesson = await Lesson.findById(lessonId);
      
      if (lesson) {
        const chapter = await Chapter.findById(lesson.chapterId);
        const section = await Section.findById(chapter.sectionId);
        
        // Update progress
        let progress = await ProgressTracking.findOne({
          userId: req.user._id,
          courseId: section.courseId,
          lessonId
        });
        
        if (!progress) {
          progress = new ProgressTracking({
            userId: req.user._id,
            courseId: section.courseId,
            lessonId,
            completed: true,
            progressPercentage: 100,
            lastAccessed: new Date()
          });
        } else {
          progress.completed = true;
          progress.progressPercentage = 100;
          progress.lastAccessed = new Date();
        }
        
        await progress.save();
      }
    }
    
    res.json({
      attempt,
      score: percentageScore,
      maxScore,
      passed,
      passingScore: quiz.passingScore
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ message: 'Failed to submit quiz attempt' });
  }
});

// Get courses assigned to a batch
router.get('/batches/:batchId/courses', authenticate, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Check if batch exists
    const batch = await Batch.findById(batchId);
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // Get assigned courses
    const batchCourses = await BatchCourse.find({ batchId })
      .populate({
        path: 'courseId',
        select: 'title description thumbnail status price salePrice enrolledCount'
      });
    
    res.json(batchCourses.map(bc => bc.courseId));
  } catch (error) {
    console.error('Error fetching batch courses:', error);
    res.status(500).json({ message: 'Failed to fetch batch courses' });
  }
});

// Platform subscription (for accessing all courses)
router.post('/subscriptions/create', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    
    let amount, validity;
    
    // Define subscription plans
    const plans = {
      monthly: { price: 999, months: 1 },
      quarterly: { price: 2499, months: 3 },
      yearly: { price: 7999, months: 12 }
    };
    
    if (!plans[plan]) {
      return res.status(400).json({ message: 'Invalid subscription plan' });
    }
    
    amount = plans[plan].price;
    validity = plans[plan].months;
    
    // Create Razorpay order for subscription
    const options = {
      amount: amount * 100, // in paise
      currency: 'INR',
      receipt: `subscription_${plan}_user_${req.user._id}`,
      payment_capture: 1
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    
    // Create transaction record
    const transaction = new Transaction({
      userId: req.user._id,
      amount,
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      currency: 'INR',
      status: 'created'
    });
    
    // Store subscription details in transaction metadata
    transaction.metadata = {
      type: 'subscription',
      plan,
      validity
    };
    
    await transaction.save();
    
    res.json({
      message: 'Subscription order created',
      order: razorpayOrder,
      transaction,
      plan
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
});

// Verify subscription payment
router.post('/subscriptions/verify', authenticate, async (req, res) => {
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
    
    // Calculate subscription expiry date
    const validity = transaction.metadata.validity;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + validity);
    
    // Update user's subscription status
    await User.findByIdAndUpdate(req.user._id, {
      subscription: {
        plan: transaction.metadata.plan,
        startDate: new Date(),
        expiryDate,
        transactionId: transaction._id,
        active: true
      }
    });
    
    // After subscription, enroll user in all published courses
    const publishedCourses = await Course.find({ status: 'Published' });
    
    for (const course of publishedCourses) {
      // Check if already enrolled
      const existingEnrollment = await Enrollment.findOne({
        userId: req.user._id,
        courseId: course._id
      });
      
      if (!existingEnrollment) {
        // Create enrollment
        const enrollment = new Enrollment({
          userId: req.user._id,
          courseId: course._id,
          enrollmentType: 'subscription',
          expiryDate
        });
        
        await enrollment.save();
        
        // Increment enrolled count
        course.enrolledCount++;
        await course.save();
      }
    }
    
    res.json({
      message: 'Subscription payment verified and activated successfully',
      subscription: {
        plan: transaction.metadata.plan,
        startDate: new Date(),
        expiryDate
      }
    });
  } catch (error) {
    console.error('Error verifying subscription payment:', error);
    res.status(500).json({ message: 'Failed to verify subscription payment' });
  }
});

module.exports = router;
    