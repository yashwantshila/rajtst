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
import dailyChallengeRoutes from './dailyChallengeRoutes.js';
import withdrawalRoutes from './withdrawalRoutes.js';
import settingsRoutes from './settingsRoutes.js';

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
router.use('/pyqs', questionPaperRoutes);

// Mega test routes
router.use('/mega-tests', megaTestRoutes);

// Public content routes
router.use('/content', contentRoutes);
router.use('/paid-contents', paidContentRoutes);

// Site settings
router.use('/settings', settingsRoutes);

// Daily challenge routes
router.use('/daily-challenges', dailyChallengeRoutes);

// Withdrawal routes
router.use('/withdrawals', withdrawalRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
