import express from 'express';
import multer from 'multer';
import { authenticate, authorizeRoles } from '../middleware/authMiddleWare.js';
import { 
    Course, 
    Section, 
    Chapter, 
    Lesson, 
    Quiz, 
    ProgressTracking, 
    QuizAttempt,
    Enrollment 
} from '../db/db.js';
import imagekit from '../utilits/imagekit.js';

const router = express.Router();

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

// Helper function to delete file from ImageKit
const deleteImageKitFile = async (url) => {
    if (!url) return;
    try {
        const fileId = url.split('/').pop().split('.')[0];
        await imagekit.deleteFile(fileId);
    } catch (error) {
        console.error(`Failed to delete file from ImageKit: ${error.message}`);
    }
};

// Lesson CRUD routes

// Update a lesson
router.put('/:lessonId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), upload.single('pdfContent'), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, type, provider, duration, content, preview, order } = req.body;
    console.log(req.body);
    
    
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
    if (preview) lesson.preview = preview === true;
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
      // Delete old PDF from ImageKit if exists
      if (lesson.content) {
        await deleteImageKitFile(lesson.content);
      }
      
      // Upload new PDF to ImageKit
      lesson.content = await uploadToImageKit(req.file, '/lesson-pdfs');
    }
    
    await lesson.save();
    
    res.json(lesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ message: 'Failed to update lesson' });
  }
});

// Delete a lesson
router.delete('/:lessonId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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
    
    // Delete PDF file from ImageKit if it's a PDF lesson
    if (lesson.type === 'pdf' && lesson.content) {
      await deleteImageKitFile(lesson.content);
    }
    
    // Delete lesson and related data
    await Promise.all([
      Lesson.findByIdAndDelete(lessonId),
      ProgressTracking.deleteMany({ lessonId }),
      QuizAttempt.deleteMany({ lessonId })
    ]);
    
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ message: 'Failed to delete lesson' });
  }
});


// Get single lesson with access check
router.get('/:lessonId', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user._id;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Get course info through chapter and section
    const chapter = await Chapter.findById(lesson.chapterId);
    const section = await Section.findById(chapter.sectionId);
    const course = await Course.findById(section.courseId);

    // Check user's access to the course
    const enrollment = await Enrollment.findOne({
      userId,
      courseId: course._id,
      status: 'Active'
    });

    // If lesson is not preview and user is not enrolled, restrict access
    if (!lesson.preview && !enrollment && 
        req.user.role !== 'Super Admin' && 
        req.user.role !== 'Admin' && 
        course.createdBy.toString() !== userId.toString()) {
      return res.json({
        title: lesson.title,
        type: lesson.type,
        duration: lesson.duration,
        preview: lesson.preview,
        isLocked: true
      });
    }

    // Track progress if user is enrolled
    if (enrollment) {
      await ProgressTracking.findOneAndUpdate(
        { userId, lessonId },
        { 
          userId,
          lessonId,
          lastAccessed: new Date()
        },
        { upsert: true }
      );
    }

    // Return full lesson data
    const lessonData = {
      ...lesson.toObject(),
      isLocked: false,
      progress: enrollment ? await ProgressTracking.findOne({ userId, lessonId }) : null
    };

    res.json(lessonData);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ message: 'Failed to fetch lesson' });
  }
});

export default router;