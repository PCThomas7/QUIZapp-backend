const express = require('express');
const sectionRoutes = express.Router();    
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { Course, Section, Chapter, Lesson } = require('../db/db');




// Section CRUD routes
sectionRoutes.post('/courses/:courseId/sections', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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
  sectionRoutes.put('/sections/:sectionId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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
  sectionRoutes.delete('/sections/:sectionId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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
  sectionRoutes.post('/sections/:sectionId/chapters', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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

  module.exports = sectionRoutes;
  