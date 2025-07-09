import express from 'express';
import {
  getQuizCategories,
  getSubCategories,
  getQuizzesByCategory,
  getQuizById
} from '../controllers/quizController.js';

const router = express.Router();

router.get('/categories', getQuizCategories);
router.get('/categories/:categoryId/sub-categories', getSubCategories);
router.get('/quizzes', getQuizzesByCategory);
router.get('/quizzes/:quizId', getQuizById);

export default router;
