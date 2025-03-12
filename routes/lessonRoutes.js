const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { Course, Section, Chapter, Lesson, Quiz, ProgressTracking, QuizAttempt } = require('../db/db');
const multer = require('multer');
const {upload } = require('../utilits/fileupload');
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