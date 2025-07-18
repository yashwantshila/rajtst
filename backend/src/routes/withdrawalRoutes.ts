import express from 'express';
import {
  createWithdrawalRequest,
  getUserWithdrawalRequests,
  getAllWithdrawalRequests,
  updateWithdrawalStatus,
  deleteWithdrawalRequest,
} from '../controllers/withdrawalController.js';
import { authenticateUser } from '../middleware/auth.js';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';

const router = express.Router();

// User routes
router.post('/', authenticateUser, createWithdrawalRequest);
router.get('/user/:userId', authenticateUser, getUserWithdrawalRequests);

// Admin routes
router.get('/admin', verifyFirebaseAdmin, getAllWithdrawalRequests);
router.put('/admin/:withdrawalId/status', verifyFirebaseAdmin, updateWithdrawalStatus);
router.delete('/admin/:withdrawalId', verifyFirebaseAdmin, deleteWithdrawalRequest);

export default router;
