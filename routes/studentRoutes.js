import express from 'express';
import studentController from '../controllers/studentController.js';

const router = express.Router();

router.get('/quizzes', studentController.getStudentQuizzes);
router.get('/analytics', studentController.getStudentAnalytics);

export default router;