import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  getQuizCategories,
  getSubCategories,
  getQuizzesByCategory,
  getQuizById
} from '../controllers/quizController.js';

const router = express.Router();

router.get('/categories', authenticateUser, getQuizCategories);
router.get('/categories/:categoryId/sub-categories', authenticateUser, getSubCategories);
router.get('/quizzes', authenticateUser, getQuizzesByCategory);
router.get('/quizzes/:quizId', authenticateUser, getQuizById);

export default router;
