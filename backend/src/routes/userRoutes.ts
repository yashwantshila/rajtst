import express from 'express';
import { getUserProfile, getUserBalance, updateUserBalance } from '../controllers/userController';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Get user profile (protected route)
router.get('/profile/:userId', authenticateUser, getUserProfile);
router.get('/balance/:userId', authenticateUser, getUserBalance);
router.post('/balance/update', authenticateUser, updateUserBalance);

export default router; 