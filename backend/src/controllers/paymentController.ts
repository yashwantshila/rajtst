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

if (!razorpayKeyId || !razorpayKeySecret) {
  console.error('Razorpay credentials are missing in environment variables');
  throw new Error('Razorpay credentials are required');
}

console.log('Initializing Razorpay with key_id:', razorpayKeyId);
console.log('Razorpay key format check:', {
  keyIdLength: razorpayKeyId.length,
  keySecretLength: razorpayKeySecret.length,
  keyIdFormat: razorpayKeyId.startsWith('rzp_') ? 'Valid' : 'Invalid',
  keySecretFormat: razorpayKeySecret.length > 20 ? 'Valid' : 'Invalid'
});

// Initialize Razorpay with proper error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret
  });
  console.log('Razorpay initialized successfully');
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

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
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
    console.log('Received payment verification request:', req.body);
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

    console.log('Verifying payment signature...');
    if (expectedSignature === razorpay_signature) {
      console.log('Payment signature verified successfully');
      
      // Use transaction to ensure data consistency when updating balance
      const newBalance = await db.runTransaction(async (transaction) => {
        const balanceRef = db.collection('balance').doc(userId);
        const balanceDoc = await transaction.get(balanceRef);
        
        if (!balanceDoc.exists) {
          // Create a new balance document if it doesn't exist
          const initialBalance = Number(amount);
          
          transaction.set(balanceRef, {
            amount: initialBalance,
            currency: 'INR',
            lastUpdated: new Date().toISOString()
          });
          
          return initialBalance;
        } else {
          // Update existing balance
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