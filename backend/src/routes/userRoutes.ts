import express from 'express';
import { getUserProfile, getUserBalance, updateUserBalance } from '../controllers/userController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Protected user routes
router.use(authenticateUser);

router.get('/profile/:userId', getUserProfile);
router.get('/balance/:userId', getUserBalance);
router.put('/balance', updateUserBalance);

export default router;