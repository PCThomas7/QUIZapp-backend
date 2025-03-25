import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    active: { type: Boolean, default: true }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add virtual for assigned quizzes
batchSchema.virtual('assignedQuizzes', {
    ref: 'QuizBatch',
    localField: '_id',
    foreignField: 'batch'
});

// Method to get all quizzes assigned to this batch
batchSchema.methods.getAssignedQuizzes = async function() {
    const assignments = await this.model('QuizBatch').find({ batch: this._id }).populate('quiz');
    const allBatchQuizzes = await this.model('Quiz').find({ batchAssignment: 'ALL' });
    return [...assignments.map(a => a.quiz), ...allBatchQuizzes];
};

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;
