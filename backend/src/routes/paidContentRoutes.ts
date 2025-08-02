import express from 'express';
import { getPaidContents, getPaidContentBySlug, downloadPaidContent } from '../controllers/paidContentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
router.get('/', getPaidContents);
router.get('/slug/:slug', getPaidContentBySlug);
router.get('/:contentId/download', authenticateUser, downloadPaidContent);
export default router;
