import express from 'express';
import { createPaymentOrder, verifyPayment, razorpayWebhook } from '../controllers/paymentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Create payment order (Requires user authentication)
router.post('/create-order', authenticateUser, createPaymentOrder);

// Verify payment (Requires user authentication - primary flow for quick UI updates)
router.post('/verify', authenticateUser, verifyPayment);

// Razorpay webhook endpoint (No user auth - secured by signature verification)
// Use express.raw to obtain the raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

export default router;