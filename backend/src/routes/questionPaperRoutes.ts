import express from 'express';
import {
  getQuestionPaperCategories,
  getQuestionPapersByCategory,
} from '../controllers/questionPaperController.js';

const router = express.Router();

router.get('/categories', getQuestionPaperCategories);
router.get('/categories/:categoryId/papers', getQuestionPapersByCategory);

export default router;
