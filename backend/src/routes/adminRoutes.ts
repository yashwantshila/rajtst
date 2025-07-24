import express from 'express';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';
import {
  getAllUsers,
  getAllBalances,
  updateUserRole,
  runWordpressAutomator,
  getAutomatorStatus,
} from '../controllers/adminController.js';

const router = express.Router();

// Protected admin routes
router.use(verifyFirebaseAdmin);

// Get all users
router.get('/users', getAllUsers);

// Get all balances
router.get('/balances', getAllBalances);

// Update user role
router.put('/users/:userId/role', updateUserRole);

// Run WordPress automation script
router.post('/automation/run', runWordpressAutomator);

// Get automation status
router.get('/automation/status', getAutomatorStatus);

export default router; 