import mongoose from 'mongoose';

const quizBatchSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Optional: Add additional assignment-specific settings
    settings: {
        startDate: Date,
        endDate: Date,
        attempts: Number,
        customInstructions: String
    }
}, {
    timestamps: true
});

// Ensure unique quiz-batch combinations
quizBatchSchema.index({ quiz: 1, batch: 1 }, { unique: true });

// Add methods for managing assignments
quizBatchSchema.statics.assignQuizToBatches = async function(quizId, batchIds, assignedBy = null) {
    const assignments = batchIds.map(batchId => ({
        quiz: quizId,
        batch: batchId,
        assignedBy
    }));
    return await this.insertMany(assignments);
};

const QuizBatch = mongoose.model('QuizBatch', quizBatchSchema);

export default QuizBatch;