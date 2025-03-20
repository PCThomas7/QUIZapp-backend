import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    timeLimit: { type: Number }, // in minutes
    passingScore: { 
      type: Number,
      default: 70
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
});

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
