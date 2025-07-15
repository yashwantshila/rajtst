import express from 'express';
import { getPaidContents, downloadPaidContent } from '../controllers/paidContentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
router.get('/', getPaidContents);
router.get('/:contentId/download', authenticateUser, downloadPaidContent);
export default router;
