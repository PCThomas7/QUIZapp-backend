import Quiz from '../models/Quiz.js';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import QuizBatch from '../models/QuizBatch.js';
import QuizAttempt from '../models/QuizAttempt.js';

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

      // Get all quiz attempts by this student
      const attempts = await QuizAttempt.find({
        user: studentId
      });

      // Create a map of quiz IDs to attempts
      const attemptMap = new Map();
      attempts.forEach(attempt => {
        attemptMap.set(attempt.quiz.toString(), attempt);
      });

      // Transform quizzes for frontend
      const transformedQuizzes = quizzes.map(quiz => {
        const quizObj = quiz.toObject();
        const quizId = quizObj._id.toString();
        const hasAttempted = attemptMap.has(quizId);
        
        return {
          ...quizObj,
          id: quizObj._id,
          attempted: hasAttempted,
          userScore: hasAttempted ? Math.round((attemptMap.get(quizId).score / attemptMap.get(quizId).maxScore) * 100) : 0,
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
  },
  
  getStudentAnalytics: async (req, res) => {
    try {
      const studentId = req.user._id;
      
      // Get all quiz attempts by this student
      const attempts = await QuizAttempt.find({
        user: studentId,
        completed: true
      }).populate({
        path: 'quiz',
        populate: {
          path: 'sections.questions',
          model: 'QuestionBank'
        }
      });
      
      if (!attempts.length) {
        return res.status(200).json({
          message: 'No quiz attempts found',
          analytics: {
            totalAttempts: 0,
            averageScore: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            unattempted: 0,
            subjectPerformance: [],
            difficultyPerformance: [],
            questionTypePerformance: [],
            recentPerformance: [],
            timeSpentAnalysis: {
              totalTimeSpent: 0,
              averageTimePerQuiz: 0,
              averageTimePerQuestion: 0
            }
          }
        });
      }
      
      // Calculate overall statistics
      const totalAttempts = attempts.length;
      const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
      const totalMaxScore = attempts.reduce((sum, attempt) => sum + attempt.maxScore, 0);
      const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      
      const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.correctAnswers, 0);
      const totalIncorrect = attempts.reduce((sum, attempt) => sum + attempt.incorrectAnswers, 0);
      const totalUnattempted = attempts.reduce((sum, attempt) => sum + attempt.unattemptedAnswers, 0);
      const totalQuestions = totalCorrect + totalIncorrect + totalUnattempted;
      
      const totalTimeSpent = attempts.reduce((sum, attempt) => sum + attempt.timeSpent, 0);
      const averageTimePerQuiz = totalAttempts > 0 ? totalTimeSpent / totalAttempts : 0;
      const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;
      
      // Subject performance analysis
      const subjectMap = new Map();
      const difficultyMap = new Map();
      const questionTypeMap = new Map();
      
      // Process each attempt to gather subject, difficulty, and question type data
      attempts.forEach(attempt => {
        const quiz = attempt.quiz;
        const answers = attempt.answers || new Map(); // Ensure answers is a Map
        
        if (!quiz || !quiz.sections) return; // Skip if quiz or sections are missing
        
        quiz.sections.forEach(section => {
          if (!section || !section.questions) return; // Skip if section or questions are missing
          
          section.questions.forEach(question => {
            if (!question) return; // Skip if question is undefined
            
            const questionId = question._id ? question._id.toString() : null;
            if (!questionId) return; // Skip if questionId is null
            
            // Check if answers and correctOptions exist before using them
            const isAnswered = answers.has(questionId) && answers.get(questionId) && answers.get(questionId).length > 0;
            const isCorrect = isAnswered && 
                              question.correctOptions && 
                              Array.isArray(question.correctOptions) && 
                              question.correctOptions.length > 0 && 
                              question.correctOptions.every(opt => 
                                answers.get(questionId).includes(opt)) && 
                              answers.get(questionId).length === question.correctOptions.length;
            
            // Process subject data
            const subject = question.subject || 'Uncategorized';
            if (!subjectMap.has(subject)) {
              subjectMap.set(subject, { 
                total: 0, correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 
              });
            }
            const subjectData = subjectMap.get(subject);
            subjectData.total += 1;
            subjectData.maxScore += question.marks || 1;
            
            if (!isAnswered) {
              subjectData.unattempted += 1;
            } else if (isCorrect) {
              subjectData.correct += 1;
              subjectData.score += question.marks || 1;
            } else {
              subjectData.incorrect += 1;
            }
            
            // Process difficulty data
            const difficulty = question.difficulty || 'Medium';
            if (!difficultyMap.has(difficulty)) {
              difficultyMap.set(difficulty, { 
                total: 0, correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 
              });
            }
            const difficultyData = difficultyMap.get(difficulty);
            difficultyData.total += 1;
            difficultyData.maxScore += question.marks || 1;
            
            if (!isAnswered) {
              difficultyData.unattempted += 1;
            } else if (isCorrect) {
              difficultyData.correct += 1;
              difficultyData.score += question.marks || 1;
            } else {
              difficultyData.incorrect += 1;
            }
            
            // Process question type data
            const questionType = question.type || 'Multiple Choice';
            if (!questionTypeMap.has(questionType)) {
              questionTypeMap.set(questionType, { 
                total: 0, correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 
              });
            }
            const typeData = questionTypeMap.get(questionType);
            typeData.total += 1;
            typeData.maxScore += question.marks || 1;
            
            if (!isAnswered) {
              typeData.unattempted += 1;
            } else if (isCorrect) {
              typeData.correct += 1;
              typeData.score += question.marks || 1;
            } else {
              typeData.incorrect += 1;
            }
          });
        });
      });
      
      // Format subject performance data
      const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
        subject,
        totalQuestions: data.total,
        correctAnswers: data.correct,
        incorrectAnswers: data.incorrect,
        unattempted: data.unattempted,
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0
      }));
      
      // Format difficulty performance data
      const difficultyPerformance = Array.from(difficultyMap.entries()).map(([difficulty, data]) => ({
        difficulty,
        totalQuestions: data.total,
        correctAnswers: data.correct,
        incorrectAnswers: data.incorrect,
        unattempted: data.unattempted,
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0
      }));
      
      // Format question type performance data
      const questionTypePerformance = Array.from(questionTypeMap.entries()).map(([type, data]) => ({
        questionType: type,
        totalQuestions: data.total,
        correctAnswers: data.correct,
        incorrectAnswers: data.incorrect,
        unattempted: data.unattempted,
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0
      }));
      
      // Get recent performance trend (last 10 attempts)
      const recentPerformance = attempts
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 10)
        .map(attempt => ({
          quizId: attempt.quiz._id,
          quizTitle: attempt.quiz.title,
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0,
          submittedAt: attempt.submittedAt
        }))
        .reverse(); // Chronological order for charting
      
      res.status(200).json({
        message: 'Student analytics fetched successfully',
        analytics: {
          totalAttempts,
          averageScore,
          totalQuestions,
          correctAnswers: totalCorrect,
          incorrectAnswers: totalIncorrect,
          unattempted: totalUnattempted,
          subjectPerformance,
          difficultyPerformance,
          questionTypePerformance,
          recentPerformance,
          timeSpentAnalysis: {
            totalTimeSpent,
            averageTimePerQuiz,
            averageTimePerQuestion
          }
        }
      });
      
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      res.status(500).json({
        message: 'Failed to fetch student analytics',
        error: error.message
      });
    }
  }
};

export default studentController;