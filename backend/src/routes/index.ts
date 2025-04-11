import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import paymentRoutes from './paymentRoutes';
import adminRoutes from './adminRoutes';

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// Add other routes here
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
// router.use('/quizzes', quizRoutes);
// etc.

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router; 