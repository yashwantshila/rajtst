import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  getQuestionPaperCategories,
  getQuestionPapersByCategory,
} from '../controllers/questionPaperController.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/categories', getQuestionPaperCategories);
router.get('/categories/:categoryId/papers', getQuestionPapersByCategory);

export default router;
