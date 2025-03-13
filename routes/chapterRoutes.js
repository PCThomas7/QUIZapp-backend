const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { Course, Section, Chapter, Lesson } = require('../db/db');
const multer = require('multer');
const imagekit = require('../utilits/imagekit');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Helper function to upload file to ImageKit
const uploadToImageKit = async (file, folder) => {
    try {
        const response = await imagekit.upload({
            file: file.buffer.toString('base64'),
            fileName: `${Date.now()}-${file.originalname}`,
            folder: folder
        });
        return response.url;
    } catch (error) {
        console.error('ImageKit upload error:', error);
        throw new Error('Failed to upload file');
    }
};

// Update a chapter
router.put('/:chapterId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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
  router.delete('/:chapterId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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
router.post('/:chapterId/lessons', 
    authenticate, 
    authorizeRoles('Super Admin', 'Admin', 'Mentor'), 
    upload.single('pdfContent'), 
    async (req, res) => {
        try {
            const { chapterId } = req.params;
            const { title, type, provider, duration, content, preview, order } = req.body;
            
            const chapter = await Chapter.findById(chapterId);
            
            if (!chapter) {
                return res.status(404).json({ message: 'Chapter not found' });
            }
            
            // Authorization check
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
                
                // Upload PDF to ImageKit
                const pdfUrl = await uploadToImageKit(req.file, '/lesson-pdfs');
                lesson.content = pdfUrl;
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
    }
);

module.exports = router;
