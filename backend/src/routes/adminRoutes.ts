import express from 'express';
import { verifyAdmin } from '../middleware/auth';
import { getAllUsers, getAllBalances, updateUserRole } from '../controllers/adminController';

const router = express.Router();

// Apply admin middleware to all routes
router.use(verifyAdmin);

// Get all users
router.get('/users', getAllUsers);

// Get all balances
router.get('/balances', getAllBalances);

// Update user role
router.patch('/users/:userId/role', updateUserRole);

export default router; 