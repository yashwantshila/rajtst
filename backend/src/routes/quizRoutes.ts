import express from 'express';
import {
  getQuizCategories,
  getSubCategories,
  getQuizzesByCategory,
  getQuizById
} from '../controllers/quizController.js';

const router = express.Router();

router.get('/categories', getQuizCategories);
router.get('/categories/:categoryIdentifier/sub-categories', getSubCategories);
router.get('/categories/:categoryIdentifier/quizzes', getQuizzesByCategory);
router.get('/categories/:categoryIdentifier/subcategories/:subcategoryIdentifier/quizzes', getQuizzesByCategory);
router.get('/quizzes', getQuizzesByCategory); // legacy query based
router.get('/quizzes/:quizId', getQuizById);

export default router;
