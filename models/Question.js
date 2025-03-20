import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    questionType: { 
      type: String, 
      enum: ['multiple-choice', 'single-choice', 'true-false'],
      required: true
    },
    options: [{ type: String }],
    correctAnswers: [{ type: String }],
    score: { 
      type: Number,
      default: 1
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true
    }
});

const Question = mongoose.model('Question', questionSchema);

export default Question;
