import express from 'express';
// import Razorpay from 'razorpay';
import multer from 'multer';
import fs from 'fs';
import { authenticate, authorizeRoles } from '../middleware/authMiddleWare.js';
import { 
    Course, 
    Section, 
    Chapter, 
    Lesson, 
    BatchCourse, 
    Enrollment, 
    Transaction, 
    Batch 
} from '../db/db.js';
import imagekit from '../utilits/imagekit.js';
import  checkCourseAccess  from '../middleware/courseMiddleWare.js';

const router = express.Router();

// Initialize Razorpay
// const razorpay = new Razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// Helper function for deleting ImageKit files
const deleteImageKitFile = async (url) => {
    if (!url) return;
    try {
        const fileId = url.split('/').pop().split('.')[0];
        await imagekit.deleteFile(fileId);
    } catch (error) {
        console.error(`Failed to delete file from ImageKit: ${error.message}`);
    }
};

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all courses
router.get('/', authenticate,authorizeRoles('Admin', 'Super Admin','Student'),async (req, res) => {
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

// Add image update route
router.put('/:id/thumbnail', authenticate, authorizeRoles('Admin', 'Super Admin'), upload.single('thumbnail'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Upload new image to ImageKit
        const uploadResponse = await imagekit.upload({
            file: req.file.buffer.toString('base64'),
            fileName: `course-${Date.now()}-${req.file.originalname}`,
            folder: '/course-thumbnails'
        });

        // Update course thumbnail URL
        course.thumbnail = uploadResponse.url;
        await course.save();

        res.json(course);
    } catch (error) {
        console.error('Error updating course thumbnail:', error);
        res.status(500).json({ message: 'Failed to update course thumbnail' });
    }
});

// Get a single course with its full structure
router.get('/:courseId', authenticate, checkCourseAccess, async (req, res) => {
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
    
   return  res.json(courseStructure);
  } catch (error) {
    console.error('Error fetching course structure:', error);
   return  res.status(500).json({ message: 'Failed to fetch course structure' });
  }
});

// Get course preview information
router.get('/:courseId/preview', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .select('title description thumbnail price salePrice totalLessons totalDuration enrolledStudents status')
      .populate({
        path: 'courseSections', // Changed from 'sections' to 'courseSections'
        select: 'title description order',
        options: { sort: { order: 1 } },
        populate: {
          path: 'chapters',
          select: 'title description order',
          options: { sort: { order: 1 } },
          populate: {
            path: 'lessons',
            select: 'title type duration preview order',
            options: { sort: { order: 1 } }
          }
        }
      });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Calculate course statistics
    const sections = await Section.find({ courseId });
    const sectionIds = sections.map(section => section._id);
    const chapters = await Chapter.find({ sectionId: { $in: sectionIds } });
    const chapterIds = chapters.map(chapter => chapter._id);
    const lessons = await Lesson.find({ chapterId: { $in: chapterIds } });

    const previewData = {
      ...course.toObject(),
      sections: course.courseSections, // Map virtual populate result
      totalSections: sections.length,
      totalChapters: chapters.length,
      totalLessons: lessons.length,
      totalDuration: lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0),
      previewLessons: lessons.filter(lesson => lesson.preview).length,
      enrolledStudents: await Enrollment.countDocuments({ 
        courseId, 
        status: 'Active' 
      })
    };

    res.json(previewData);
  } catch (error) {
    console.error('Error fetching course preview:', error);
    res.status(500).json({ message: 'Failed to fetch course preview' });
  }
});

// Update a course
router.put('/:courseId', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), upload.single('thumbnail'), async (req, res) => {
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
router.delete('/:courseId', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
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
    
    // Delete lesson PDFs from ImageKit
    for (const lesson of lessons) {
      if (lesson.type === 'pdf' && lesson.content) {
        await deleteImageKitFile(lesson.content);
      }
    }
    
    // Delete course thumbnail from ImageKit
    if (course.thumbnail) {
      await deleteImageKitFile(course.thumbnail);
    }
    
    // Delete all related documents from MongoDB
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
router.post('/:courseId/sections', authenticate, authorizeRoles('Super Admin', 'Admin', 'Mentor'), async (req, res) => {
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

// Update course pricing
router.put('/:courseId/pricing', 
  authenticate, 
  authorizeRoles('Super Admin', 'Admin'), 
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { price, salePrice, enableRazorpay } = req.body;

      // Validate the course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Validate price inputs
      if (price < 0 || (salePrice && salePrice < 0)) {
        return res.status(400).json({ message: 'Price cannot be negative' });
      }

      if (salePrice && salePrice >= price) {
        return res.status(400).json({ 
          message: 'Sale price must be less than regular price' 
        });
      }

      // Update pricing details
      course.price = price;
      course.salePrice = salePrice || null; // If salePrice is undefined/null, remove it
      course.enableRazorpay = Boolean(enableRazorpay);

      await course.save();

      res.json({
        message: 'Course pricing updated successfully',
        course: {
          id: course._id,
          title: course.title,
          price: course.price,
          salePrice: course.salePrice,
          enableRazorpay: course.enableRazorpay
        }
      });

    } catch (error) {
      console.error('Error updating course pricing:', error);
      res.status(500).json({ message: 'Failed to update course pricing' });
    }
  }
);


// Batch assignment routes
router.post('/:courseId/batches', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
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
// router.post('/:courseId/enroll', authenticate, async (req, res) => {
//   try {
//     const { courseId } = req.params;
    
//     const course = await Course.findById(courseId);
    
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }
    
//     if (course.status !== 'Published') {
//       return res.status(400).json({ message: 'Course is not published' });
//     }
    
//     // Check if user is already enrolled
//     const existingEnrollment = await Enrollment.findOne({
//       userId: req.user._id,
//       courseId
//     });
    
//     if (existingEnrollment) {
//       return res.status(400).json({ message: 'You are already enrolled in this course' });
//     }
    
//     // Check if user has batch access
//     const userBatches = req.user.batches || [];
    
//     const batchAccess = await BatchCourse.findOne({
//       courseId,
//       batchId: { $in: userBatches }
//     });
    
//     if (batchAccess) {
//       // Enroll via batch access
//       const enrollment = new Enrollment({
//         userId: req.user._id,
//         courseId,
//         enrollmentType: 'batch'
//       });
      
//       // Set expiry date if batch subscription has an expiry
//       const batchSubscription = req.user.batchSubscriptions.find(
//         sub => userBatches.some(b => b.toString() === sub.batch.toString())
//       );
      
//       if (batchSubscription && batchSubscription.expiresOn) {
//         enrollment.expiryDate = batchSubscription.expiresOn;
//       }
      
//       await enrollment.save();
      
//       // Increment enrolled count
//       course.enrolledCount++;
//       await course.save();
      
//       return res.status(201).json({
//         message: 'Enrolled successfully via batch access',
//         enrollment
//       });
//     }
    
//     // Check if course is free
//     if (course.price === 0) {
//       // Free enrollment
//       const enrollment = new Enrollment({
//         userId: req.user._id,
//         courseId,
//         enrollmentType: 'free'
//       });
      
//       await enrollment.save();
      
//       // Increment enrolled count
//       course.enrolledCount++;
//       await course.save();
      
//       return res.status(201).json({
//         message: 'Enrolled successfully in free course',
//         enrollment
//       });
//     }
    
//     // For paid courses, create Razorpay order
//     if (!course.enableRazorpay) {
//       return res.status(400).json({ message: 'Payment is not enabled for this course' });
//     }
    
//     // Use sale price if available, otherwise use regular price
//     const amount = (course.salePrice || course.price) * 100; // Convert to paise
    
//     const options = {
//       amount,
//       currency: 'INR',
//       receipt: `course_${courseId}_user_${req.user._id}`,
//       payment_capture: 1
//     };
    
//     const razorpayOrder = await razorpay.orders.create(options);
    
//     // Create transaction record
//     const transaction = new Transaction({
//       userId: req.user._id,
//       courseId,
//       orderId: razorpayOrder.id,
//       razorpayOrderId: razorpayOrder.id,
//       amount: amount / 100, // Convert back to rupees for storage
//       currency: 'INR',
//       status: 'created'
//     });
    
//     await transaction.save();
    
//     res.json({
//       message: 'Payment order created',
//       order: razorpayOrder,
//       transaction
//     });
//   } catch (error) {
//     console.error('Error enrolling in course:', error);
//     res.status(500).json({ message: 'Failed to enroll in course' });
//   }
// });

router.get('/:courseId/preview', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .select('title description thumbnail price salePrice totalLessons totalDuration enrolledStudents status')
      .populate({
        path: 'courseSections', // Changed from 'sections' to 'courseSections'
        select: 'title description order',
        options: { sort: { order: 1 } },
        populate: {
          path: 'chapters',
          select: 'title description order',
          options: { sort: { order: 1 } },
          populate: {
            path: 'lessons',
            select: 'title type duration preview order',
            options: { sort: { order: 1 } }
          }
        }
      });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Calculate course statistics
    const sections = await Section.find({ courseId });
    const sectionIds = sections.map(section => section._id);
    const chapters = await Chapter.find({ sectionId: { $in: sectionIds } });
    const chapterIds = chapters.map(chapter => chapter._id);
    const lessons = await Lesson.find({ chapterId: { $in: chapterIds } });

    const previewData = {
      ...course.toObject(),
      sections: course.courseSections, // Map virtual populate result
      totalSections: sections.length,
      totalChapters: chapters.length,
      totalLessons: lessons.length,
      totalDuration: lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0),
      previewLessons: lessons.filter(lesson => lesson.preview).length,
      enrolledStudents: await Enrollment.countDocuments({ 
        courseId, 
        status: 'Active' 
      })
    };

    res.json(previewData);
  } catch (error) {
    console.error('Error fetching course preview:', error);
    res.status(500).json({ message: 'Failed to fetch course preview' });
  }
});

// // Enrollment and payment routes
// router.post('/courses/:courseId/enroll', authenticate, async (req, res) => {
//   try {
//     const { courseId } = req.params;
    
//     const course = await Course.findById(courseId);
    
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }
    
//     if (course.status !== 'Published') {
//       return res.status(400).json({ message: 'Course is not published' });
//     }
    
//     // Check if user is already enrolled
//     const existingEnrollment = await Enrollment.findOne({
//       userId: req.user._id,
//       courseId
//     });
    
//     if (existingEnrollment) {
//       return res.status(400).json({ message: 'You are already enrolled in this course' });
//     }
    
//     // Check if user has batch access
//     const userBatches = req.user.batches || [];
    
//     const batchAccess = await BatchCourse.findOne({
//       courseId,
//       batchId: { $in: userBatches }
//     });
    
//     if (batchAccess) {
//       // Enroll via batch access
//       const enrollment = new Enrollment({
//         userId: req.user._id,
//         courseId,
//         enrollmentType: 'batch'
//       });
      
//       // Set expiry date if batch subscription has an expiry
//       const batchSubscription = req.user.batchSubscriptions.find(
//         sub => userBatches.some(b => b.toString() === sub.batch.toString())
//       );
      
//       if (batchSubscription && batchSubscription.expiresOn) {
//         enrollment.expiryDate = batchSubscription.expiresOn;
//       }
      
//       await enrollment.save();
      
//       // Increment enrolled count
//       course.enrolledCount++;
//       await course.save();
      
//       return res.status(201).json({
//         message: 'Enrolled successfully via batch access',
//         enrollment
//       });
//     }
    
//     // Check if course is free
//     if (course.price === 0) {
//       // Free enrollment
//       const enrollment = new Enrollment({
//         userId: req.user._id,
//         courseId,
//         enrollmentType: 'free'
//       });
      
//       await enrollment.save();
      
//       // Increment enrolled count
//       course.enrolledCount++;
//       await course.save();
      
//       return res.status(201).json({
//         message: 'Enrolled successfully in free course',
//         enrollment
//       });
//     }
    
//     // For paid courses, create Razorpay order
//     if (!course.enableRazorpay) {
//       return res.status(400).json({ message: 'Payment is not enabled for this course' });
//     }
    
//     // Use sale price if available, otherwise use regular price
//     const amount = (course.salePrice || course.price) * 100; // Convert to paise
    
//     const options = {
//       amount,
//       currency: 'INR',
//       receipt: `course_${courseId}_user_${req.user._id}`,
//       payment_capture: 1
//     };
    
//     const razorpayOrder = await razorpay.orders.create(options);
    
//     // Create transaction record
//     const transaction = new Transaction({
//       userId: req.user._id,
//       courseId,
//       orderId: razorpayOrder.id,
//       razorpayOrderId: razorpayOrder.id,
//       amount: amount / 100, // Convert back to rupees for storage
//       currency: 'INR',
//       status: 'created'
//     });
    
//     await transaction.save();
    
//     res.json({
//       message: 'Payment order created',
//       order: razorpayOrder,
//       transaction
//     });
//   } catch (error) {
//     console.error('Error enrolling in course:', error);
//     res.status(500).json({ message: 'Failed to enroll in course' });
//   }
// });

export default router;