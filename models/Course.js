const mongoose = require('mongoose');

  const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    thumbnail: {
        type: String
    },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Archived'],
        default: 'Draft'
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    salePrice: {
        type: Number,
        min: 0
    },
    enableRazorpay: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    sections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section'
    }],
    totalLessons: {
        type: Number,
        default: 0
    },
    totalDuration: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for sections
courseSchema.virtual('courseSections', {
    ref: 'Section',
    localField: '_id',
    foreignField: 'courseId'
});

module.exports = mongoose.model('Course', courseSchema);
