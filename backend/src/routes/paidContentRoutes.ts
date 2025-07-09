import express from 'express';
import { getPaidContents } from '../controllers/paidContentController.js';

const router = express.Router();
router.get('/', getPaidContents);
export default router;
