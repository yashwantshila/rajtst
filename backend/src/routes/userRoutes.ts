import express from 'express';
import { getUserProfile } from '../controllers/userController';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Get user profile (protected route)
router.get('/profile/:userId', authenticateUser, getUserProfile);

export default router; 