import mongoose from 'mongoose';

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
    enrollmentType: {
      type: String,
      enum: ['free', 'paid', 'batch'],
      required: true
    },
    status: {
      type: String,
      enum: ['Active', 'Expired', 'Cancelled'],
      default: 'Active'
    },
    expiryDate: Date,
    enrolledAt: {
      type: Date,
      default: Date.now
    }
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
