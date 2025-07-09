import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getPaidContents } from '../controllers/paidContentController.js';

const router = express.Router();
router.use(authenticateUser);
router.get('/', getPaidContents);
export default router;
