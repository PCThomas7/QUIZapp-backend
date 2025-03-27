import express from "express";
import QuizController from "../controllers/QuizController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleWare.js";

const router = express.Router();

// Quiz CRUD operations
router.post("/", QuizController.createQuiz);
router.get("/", QuizController.getQuizzes);
router.get("/:id", QuizController.getQuiz);
router.put("/:id", QuizController.updateQuiz);
router.delete("/:id", authenticate, QuizController.deleteQuiz);

// Quiz Attempts operations - with authentication
router.post("/:id/attempts", authenticate, QuizController.submitQuizAttempt);
router.get("/:id/attempts", authenticate, QuizController.getAllQuizAttempts);
router.get(
  "/:id/attempts/me",
  authenticate,
  QuizController.getUserQuizAttempts
);
router.get("/attempts/:id", authenticate, QuizController.getQuizAttemptDetails);
router.get(
  "/:id/attempts/me/report",
  authenticate,
  QuizController.getDetailedQuizReport
);

// Quiz Batch Assignment routes
router.post(
  "/:id/batches",
  authenticate,
  authorizeRoles("Admin", "Super Admin"),
  QuizController.assignQuizToBatches
);
router.get("/:id/batches", authenticate, QuizController.getQuizBatches);

// Add new route
router.post(
    "/update-quiz-usage",
    authenticate,
    authorizeRoles("Admin", "Super Admin",),
    QuizController.updateQuestionUsage
  );

// Uncomment these when you implement them
// // Quiz Questions operations
// router.get('/:id/questions', QuizController.getQuizQuestions);
// router.post('/:id/questions', QuizController.addQuestionToQuiz);
// router.put('/questions/:id', QuizController.updateQuestion);
// router.delete('/questions/:id', QuizController.deleteQuestion);
// router.post('/:id/questions/reorder', QuizController.reorderQuestions);

// // Quiz Statistics
// router.get('/:id/statistics', QuizController.getQuizStatistics);
// router.get('/questions/:id/statistics', QuizController.getQuestionStatistics);


// Add these routes to your existing QuizRoutes.js file

// Schedule a quiz
router.post('/:quizId/schedule', authenticate, authorizeRoles('Admin'), quizController.scheduleQuiz);

// Get quiz schedule
router.get('/:quizId/schedule', authenticate, quizController.getQuizSchedule);

export default router;
