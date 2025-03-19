const mongoose = require('mongoose');

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

module.exports = mongoose.model('BatchCourse', batchCourseSchema);
