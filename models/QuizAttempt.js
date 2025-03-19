import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    score: { type: Number },
    passed: { type: Boolean },
    attemptDate: {
      type: Date,
      default: Date.now
    },
    timeTaken: { type: Number } // in seconds
});

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

export default QuizAttempt;
