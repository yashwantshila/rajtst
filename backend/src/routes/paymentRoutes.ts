import express from 'express';
import { createPaymentOrder, verifyPayment, razorpayWebhook } from '../controllers/paymentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Create payment order (Requires user authentication)
router.post('/create-order', authenticateUser, createPaymentOrder);

// Verify payment (Requires user authentication - primary flow for quick UI updates)
router.post('/verify', authenticateUser, verifyPayment);

// Razorpay webhook endpoint (No user auth - secured by signature verification)
// This endpoint receives server-to-server updates from Razorpay
router.post('/webhook', express.json(), razorpayWebhook);

export default router;