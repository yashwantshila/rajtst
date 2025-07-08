import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';
import megaTestRoutes from './megaTestRoutes.js';

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

// Mega Test routes
router.use('/megatests', megaTestRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router; 