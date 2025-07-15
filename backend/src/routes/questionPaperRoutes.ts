import express from 'express';
import {
  getQuestionPaperCategories,
  getQuestionPapersByCategory,
  downloadQuestionPaper,
} from '../controllers/questionPaperController.js';

const router = express.Router();

router.get('/categories', getQuestionPaperCategories);
router.get('/categories/:categoryId/papers', getQuestionPapersByCategory);
router.get('/papers/:paperId/download', downloadQuestionPaper);

export default router;
