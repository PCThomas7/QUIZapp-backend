import { Course, Enrollment, BatchCourse } from '../db/db.js';

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

export default checkCourseAccess;