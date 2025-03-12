const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { Course, Section, Chapter, Lesson } = require('../db/db');


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
  