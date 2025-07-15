import express from 'express';
import {
  getPaidContents,
  downloadPaidContent,
  downloadSampleContent,
} from '../controllers/paidContentController.js';

const router = express.Router();
router.get('/', getPaidContents);
router.get('/:contentId/download', downloadPaidContent);
router.get('/:contentId/sample', downloadSampleContent);
export default router;
