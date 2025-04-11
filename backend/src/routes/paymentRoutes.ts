import express from 'express';
import { createPaymentOrder, verifyPayment } from '../controllers/paymentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Create payment order
router.post('/create-order', authenticateUser, createPaymentOrder);

// Verify payment
router.post('/verify', authenticateUser, verifyPayment);

export default router; 