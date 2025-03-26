import express from 'express';
import studentController from '../controllers/studentController.js';
import { authenticate } from '../middleware/authMiddleWare.js';

const router = express.Router();

router.get('/quizzes', studentController.getStudentQuizzes);
router.get('/analytics', studentController.getStudentAnalytics);

// Student-created quizzes routes
router.get('/my-quizzes', authenticate, studentController.getStudentCreatedQuizzes);
router.delete('/my-quizzes/:id', authenticate, studentController.deleteStudentQuiz);

export default router;