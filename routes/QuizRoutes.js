import express from 'express';
import QuizController from '../controllers/QuizController';

const router = express.Router();

// Quiz CRUD operations
router.post('/', QuizController.createQuiz);
router.get('/', QuizController.getQuizzes);
router.get('/:id', QuizController.getQuiz);
router.put('/:id', QuizController.updateQuiz);
router.delete('/:id', QuizController.deleteQuiz);

// Quiz Questions operations
router.get('/:id/questions', QuizController.getQuizQuestions);
router.post('/:id/questions', QuizController.addQuestionToQuiz);
router.put('/questions/:id', QuizController.updateQuestion);
router.delete('/questions/:id', QuizController.deleteQuestion);
router.post('/:id/questions/reorder', QuizController.reorderQuestions);

// Quiz Attempts operations
router.post('/:id/attempts', QuizController.submitQuizAttempt);
router.get('/:id/attempts', QuizController.getAllQuizAttempts);
router.get('/:id/attempts/me', QuizController.getUserQuizAttempts);
router.get('/attempts/:id', QuizController.getQuizAttemptDetails);

// Quiz Statistics
router.get('/:id/statistics', QuizController.getQuizStatistics);
router.get('/questions/:id/statistics', QuizController.getQuestionStatistics);

export default router;