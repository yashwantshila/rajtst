import express from 'express';
import { createBlogPost, getBlogPosts, getBlogPostBySlug } from '../controllers/blogController.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getBlogPosts);
router.get('/:slug', getBlogPostBySlug);
router.post('/', verifyAdmin, createBlogPost);

export default router;
