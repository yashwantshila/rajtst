import express from 'express';
import { getContentBySlug } from '../controllers/contentController.js';

const router = express.Router();

router.get('/:slug', getContentBySlug);

export default router;
