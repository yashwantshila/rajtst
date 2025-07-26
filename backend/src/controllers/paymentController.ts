import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import { db } from '../config/firebase.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Check if Razorpay credentials are available
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!razorpayKeyId || !razorpayKeySecret) {
  console.error('Razorpay credentials are missing in environment variables');
  throw new Error('Razorpay credentials are required');
}

if (process.env.NODE_ENV !== 'production') {
  console.log('Initializing Razorpay...');
}

// Initialize Razorpay with proper error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log('Razorpay initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Razorpay:', error);
  throw new Error('Failed to initialize Razorpay: ' + (error as Error).message);
}

export const createPaymentOrder = async (req: Request, res: Response) => {
  try {
    const { amount, userId } = req.body;

    if (!amount || !userId) {
      return res.status(400).json({ error: 'Amount and userId are required' });
    }
    
    try {
      // Generate a shorter receipt ID that's under 40 characters
      const timestamp = Date.now().toString().slice(-6);
      const shortUserId = userId.slice(0, 8);
      const receiptId = `r_${shortUserId}_${timestamp}`;
      
      // Create Razorpay order with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let order;

      while (retryCount < maxRetries) {
        try {
          order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: receiptId,
            notes: {
              userId: userId
            }
          });
          break;
        } catch (error: any) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          // Wait for 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!order) {
        throw new Error('Order not found');
      }

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: razorpayKeyId
      });
    } catch (razorpayError: any) {
      const statusCode = razorpayError.statusCode || 500;
      res.status(statusCode).json({ 
        error: 'Payment service error',
        code: razorpayError.error?.code || 'PAYMENT_ERROR'
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to create payment order',
      code: 'UNKNOWN_ERROR'
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Verifying payment via frontend handler...');
    }
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      amount
    } = req.body;

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Payment verified successfully via frontend');
      }

      // Idempotency Check: Ensure payment isn't processed twice
      const paymentRef = db.collection('payments').where('paymentId', '==', razorpay_payment_id);
      const paymentSnapshot = await paymentRef.get();
      if (!paymentSnapshot.empty) {
        console.log('Payment already processed.');
        // Still need to return the user's latest balance
        const balanceDoc = await db.collection('balance').doc(userId).get();
        const newBalance = balanceDoc.exists ? balanceDoc.data()?.amount : 0;
        return res.json({
          success: true,
          message: 'Payment already verified',
          newBalance
        });
      }
      
      // Use transaction to ensure data consistency when updating balance
      const newBalance = await db.runTransaction(async (transaction) => {
        const balanceRef = db.collection('balance').doc(userId);
        const balanceDoc = await transaction.get(balanceRef);
        
        if (!balanceDoc.exists) {
          const initialBalance = Number(amount);
          transaction.set(balanceRef, {
            amount: initialBalance,
            currency: 'INR',
            lastUpdated: new Date().toISOString()
          });
          return initialBalance;
        } else {
          const currentBalance = balanceDoc.data()?.amount || 0;
          const updatedBalance = currentBalance + Number(amount);
          transaction.update(balanceRef, {
            amount: updatedBalance,
            lastUpdated: new Date().toISOString()
          });
          return updatedBalance;
        }
      });

      // Save payment record to database
      await db.collection('payments').add({
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: Number(amount),
        currency: 'INR',
        status: 'completed',
        source: 'frontend_verify',
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Payment verified and balance updated successfully',
        newBalance
      });
    } else {
      console.log('Invalid payment signature');
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: error.message
    });
  }
};

// Razorpay Webhook Handler
export const razorpayWebhook = async (req: Request, res: Response) => {
  if (!razorpayWebhookSecret) {
    console.error('Razorpay webhook secret is not configured.');
    return res.status(500).json({ error: 'Webhook service not configured' });
  }

  // Verify webhook signature using the raw request body
  const signature = req.headers['x-razorpay-signature'] as string;
  const bodyBuffer = req.body as Buffer;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', razorpayWebhookSecret)
      .update(bodyBuffer)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  } catch(error) {
     console.error('Error during webhook signature verification:', error);
     return res.status(500).json({ error: 'Webhook signature verification failed' });
  }

  // Process the event
  const event = JSON.parse(bodyBuffer.toString());
  if (event.event === 'payment.captured') {
    const paymentEntity = event.payload.payment.entity;
    const { order_id, id: paymentId, amount, notes } = paymentEntity;
    const userId = notes?.userId;

    if (!userId) {
      console.error('Webhook Error: userId not found in payment notes. Order ID:', order_id);
      // Return 200 to Razorpay to prevent retries for this issue
      return res.status(200).json({ message: 'User ID missing from notes, cannot process.' });
    }

    try {
      // Idempotency: check if payment already processed
      const paymentsRef = db.collection('payments');
      const existingPayment = await paymentsRef.where('paymentId', '==', paymentId).limit(1).get();
      if (!existingPayment.empty) {
        console.log(`Webhook: Payment ${paymentId} already processed.`);
        return res.status(200).json({ message: 'Payment already processed' });
      }

      // Update user balance in a transaction
      const amountInRupees = Number(amount) / 100; // Razorpay sends amount in paise
      await db.runTransaction(async (transaction) => {
        const balanceRef = db.collection('balance').doc(userId);
        const balanceDoc = await transaction.get(balanceRef);

        if (!balanceDoc.exists) {
          transaction.set(balanceRef, {
            amount: amountInRupees,
            currency: 'INR',
            lastUpdated: new Date().toISOString(),
          });
        } else {
          const currentBalance = balanceDoc.data()?.amount || 0;
          transaction.update(balanceRef, {
            amount: currentBalance + amountInRupees,
            lastUpdated: new Date().toISOString(),
          });
        }
      });

      // Record payment
      await paymentsRef.add({
        userId,
        orderId: order_id,
        paymentId,
        amount: amountInRupees,
        currency: 'INR',
        status: 'completed',
        source: 'webhook',
        timestamp: new Date().toISOString(),
      });

       console.log(`Webhook: Successfully processed payment ${paymentId} for user ${userId}.`);

    } catch (dbError) {
      console.error(`Webhook: Database error for payment ${paymentId}:`, dbError);
      // Return 500 to signal Razorpay to retry the webhook
      return res.status(500).json({ error: 'Database processing failed' });
    }
  }

  // Acknowledge receipt of the event
  res.status(200).json({ status: 'ok' });
};