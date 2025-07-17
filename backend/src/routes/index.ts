import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';
import quizRoutes from './quizRoutes.js';
import questionPaperRoutes from './questionPaperRoutes.js';
import megaTestRoutes from './megaTestRoutes.js';
import contentRoutes from './contentRoutes.js';
import paidContentRoutes from './paidContentRoutes.js';
import headerAdsRoutes from './headerAdsRoutes.js';

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

// Quiz routes
router.use('/quiz', quizRoutes);

// Question paper routes
router.use('/question-papers', questionPaperRoutes);

// Mega test routes
router.use('/mega-tests', megaTestRoutes);

// Public content routes
router.use('/content', contentRoutes);
router.use('/paid-contents', paidContentRoutes);
router.use('/header-ads', headerAdsRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});export default router; 