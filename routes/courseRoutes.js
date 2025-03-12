const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { Course } = require('../db/db');
const multer = require('multer');
const imagekit = require('../utilits/imagekit');
const checkCourseAccess = require('../middleware/courseMiddleWare');
const fs = require('fs');

// Configure multer for memory storage instead of disk
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all courses
router.get('/', authenticate,authorizeRoles('Admin', 'Super Admin'),async (req, res) => {
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
router.post('/', authenticate, authorizeRoles('Admin', 'Super Admin'), upload.single('thumbnail'), async (req, res) => {
    try {
        const { title, description, status, price, salePrice, enableRazorpay } = req.body;
        
        let thumbnailUrl;
        if (req.file) {
            // Upload to ImageKit
            const uploadResponse = await imagekit.upload({
                file: req.file.buffer.toString('base64'),
                fileName: `course-${Date.now()}-${req.file.originalname}`,
                folder: '/course-thumbnails'
            });
            thumbnailUrl = uploadResponse.url;
        }
        
        const course = new Course({
            title,
            description,
            status: status || 'Draft',
            price: price || 0,
            salePrice: salePrice || undefined,
            createdBy: req.user._id, // Use logged-in user's ID
            enableRazorpay: enableRazorpay === 'true',
            thumbnail: thumbnailUrl
        });
        
        await course.save();
        
        res.status(201).json(course);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Failed to create course' });
    }
});

// // Add image update route
// router.put('/:id/thumbnail', authenticate, authorizeRoles('Admin', 'Super Admin'), upload.single('thumbnail'), async (req, res) => {
//     try {
//         const course = await Course.findById(req.params.id);
//         if (!course) {
//             return res.status(404).json({ message: 'Course not found' });
//         }

//         if (!req.file) {
//             return res.status(400).json({ message: 'No image file provided' });
//         }

//         // Upload new image to ImageKit
//         const uploadResponse = await imagekit.upload({
//             file: req.file.buffer.toString('base64'),
//             fileName: `course-${Date.now()}-${req.file.originalname}`,
//             folder: '/course-thumbnails'
//         });

//         // Update course thumbnail URL
//         course.thumbnail = uploadResponse.url;
//         await course.save();

//         res.json(course);
//     } catch (error) {
//         console.error('Error updating course thumbnail:', error);
//         res.status(500).json({ message: 'Failed to update course thumbnail' });
//     }
// });


// // Get a single course with its full structure
// router.get('/:id', authenticate, checkCourseAccess, async (req, res) => {
//   try {
//     const  courseId  = req.params.id;
    
//     // Get the course
//     const course = await Course.findById(courseId)
//       .populate('createdBy', 'name email');
    
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }
    
//     // Get all sections
//     const sections = await Section.find({ courseId })
//       .sort({ order: 1 });
    
//     // Get all chapters for these sections
//     const sectionIds = sections.map(section => section._id);
//     const chapters = await Chapter.find({ sectionId: { $in: sectionIds } })
//       .sort({ order: 1 });
    
//     // Get all lessons for these chapters
//     const chapterIds = chapters.map(chapter => chapter._id);
//     const lessons = await Lesson.find({ chapterId: { $in: chapterIds } })
//       .sort({ order: 1 });
    
//     // Get batch assignments
//     const batchAssignments = await BatchCourse.find({ courseId })
//       .populate('batchId', 'name');
      
//     // Build full course structure
//     const courseStructure = {
//       ...course.toObject(),
//       sections: sections.map(section => ({
//         ...section.toObject(),
//         chapters: chapters
//           .filter(chapter => chapter.sectionId.toString() === section._id.toString())
//           .map(chapter => ({
//             ...chapter.toObject(),
//             lessons: lessons
//               .filter(lesson => lesson.chapterId.toString() === chapter._id.toString())
//               .map(lesson => {
//                 // If preview only access, filter out non-preview lessons
//                 if (req.previewOnly && !lesson.preview) {
//                   return {
//                     ...lesson.toObject(),
//                     content: null, // Don't send content for non-preview lessons
//                     isLocked: true
//                   };
//                 }
//                 return {
//                   ...lesson.toObject(),
//                   isLocked: false
//                 };
//               })
//           }))
//       })),
//       assignedBatches: batchAssignments.map(assignment => assignment.batchId),
//       userAccess: {
//         hasFullAccess: !req.previewOnly,
//         enrollmentType: req.enrollment ? req.enrollment.enrollmentType : null,
//         expiryDate: req.enrollment ? req.enrollment.expiryDate : null
//       }
//     };
    
//     res.json(courseStructure);
//   } catch (error) {
//     console.error('Error fetching course structure:', error);
//     res.status(500).json({ message: 'Failed to fetch course structure' });
//   }
// });

// // Update a course
// router.put('/:courseId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), upload.single('thumbnail'), async (req, res) => {
//   try {
//     const { courseId } = req.params;
//     const { title, description, status, price, salePrice, enableRazorpay } = req.body;
    
//     const course = await Course.findById(courseId);
    
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }
    
//     // Check if user is authorized to edit this course
//     if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin' && 
//         course.createdBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized to edit this course' });
//     }
    
//     // Update course fields
//     if (title) course.title = title;
//     if (description !== undefined) course.description = description;
//     if (status) course.status = status;
//     if (price !== undefined) course.price = price;
//     if (salePrice !== undefined) course.salePrice = salePrice || null;
//     if (enableRazorpay !== undefined) course.enableRazorpay = enableRazorpay === 'true';
    
//     // Update thumbnail if provided
//     if (req.file) {
//       // Delete old thumbnail if it exists
//       if (course.thumbnail) {
//         const oldPath = path.join(__dirname, '..', course.thumbnail);
//         if (fs.existsSync(oldPath)) {
//           fs.unlinkSync(oldPath);
//         }
//       }
      
//       course.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
//     }
    
//     await course.save();
    
//     res.json(course);
//   } catch (error) {
//     console.error('Error updating course:', error);
//     res.status(500).json({ message: 'Failed to update course' });
//   }
// });

// // Delete a course
// router.delete('/:courseId', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
//   try {
//     const { courseId } = req.params;
    
//     const course = await Course.findById(courseId);
    
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }
    
//     // Check if there are enrollments for this course
//     const enrollmentCount = await Enrollment.countDocuments({ courseId });
    
//     if (enrollmentCount > 0) {
//       return res.status(400).json({ 
//         message: 'Cannot delete course with existing enrollments',
//         enrollmentCount
//       });
//     }
    
//     // Delete all lessons, chapters, and sections
//     const sections = await Section.find({ courseId });
//     const sectionIds = sections.map(section => section._id);
    
//     const chapters = await Chapter.find({ sectionId: { $in: sectionIds } });
//     const chapterIds = chapters.map(chapter => chapter._id);
    
//     const lessons = await Lesson.find({ chapterId: { $in: chapterIds } });
    
//     // Delete lesson files (PDFs)
//     for (const lesson of lessons) {
//       if (lesson.type === 'pdf' && lesson.content) {
//         const pdfPath = path.join(__dirname, '..', 'uploads', 'pdfs', path.basename(lesson.content));
//         if (fs.existsSync(pdfPath)) {
//           fs.unlinkSync(pdfPath);
//         }
//       }
//     }
    
//     // Delete thumbnail
//     if (course.thumbnail) {
//       const thumbnailPath = path.join(__dirname, '..', course.thumbnail);
//       if (fs.existsSync(thumbnailPath)) {
//         fs.unlinkSync(thumbnailPath);
//       }
//     }
    
//     // Delete all related documents
//     await Promise.all([
//       Lesson.deleteMany({ chapterId: { $in: chapterIds } }),
//       Chapter.deleteMany({ sectionId: { $in: sectionIds } }),
//       Section.deleteMany({ courseId }),
//       BatchCourse.deleteMany({ courseId }),
//       Course.findByIdAndDelete(courseId)
//     ]);
    
//     res.json({ message: 'Course and all related content deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting course:', error);
//     res.status(500).json({ message: 'Failed to delete course' });
//   }
// });


module.exports = router;  // Export the router directly, not as an object