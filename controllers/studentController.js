import Quiz from '../models/Quiz.js';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import QuizBatch from '../models/QuizBatch.js';

const studentController = {
  getStudentQuizzes: async (req, res) => {
    try {
      const studentId = req.user._id;

      // Get student's batches
      const student = await User.findById(studentId).populate('batches');
      const studentBatchIds = student.batches.map(batch => batch._id);

      // Get quizzes assigned to student's batches
      const quizzes = await Quiz.find({
        $or: [
          { batchAssignment: 'ALL' }, // Quizzes assigned to all batches
          {
            batchAssignment: 'SPECIFIC',
            _id: {
              $in: await QuizBatch.distinct('quiz', {
                batch: { $in: studentBatchIds }
              })
            }
          }
        ]
      }).populate({
        path: 'sections.questions',
        model: 'QuestionBank'
      });

      // Transform quizzes for frontend
      const transformedQuizzes = quizzes.map(quiz => {
        const quizObj = quiz.toObject();
        return {
          ...quizObj,
          id: quizObj._id,
          sections: quizObj.sections.map(section => ({
            ...section,
            id: section._id
          }))
        };
      });

      res.status(200).json({
        message: 'Student quizzes fetched successfully',
        quizzes: transformedQuizzes
      });
    } catch (error) {
      console.error('Error fetching student quizzes:', error);
      res.status(500).json({
        message: 'Failed to fetch student quizzes',
        error: error.message
      });
    }
  }
};

export default studentController;