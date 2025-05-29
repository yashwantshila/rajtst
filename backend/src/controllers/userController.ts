import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's balance from Firestore
    const balanceDoc = await db.collection('balance').doc(userId).get();
    const balance = balanceDoc.exists ? balanceDoc.data() : { amount: 0, currency: 'INR' };

    res.json({
      username: userDoc.data()?.username,
      email: userDoc.data()?.email,
      balance: balance
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const getUserBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const balanceDoc = await db.collection('balance').doc(userId).get();
    
    if (balanceDoc.exists) {
      return res.json(balanceDoc.data());
    } else {
      // Create balance document if it doesn't exist
      const defaultBalance = {
        amount: 0,
        currency: 'INR',
        lastUpdated: new Date().toISOString(),
      };
      
      await db.collection('balance').doc(userId).set(defaultBalance);
      return res.json(defaultBalance);
    }
  } catch (error) {
    console.error('Error getting user balance:', error);
    return res.status(500).json({ error: 'Failed to get user balance' });
  }
};

export const updateUserBalance = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({ error: 'User ID and amount are required' });
    }

    const balanceRef = db.collection('balance').doc(userId);
    
    // Use a transaction to ensure data consistency
    const newBalance = await db.runTransaction(async (transaction) => {
      const balanceDoc = await transaction.get(balanceRef);
      
      if (balanceDoc.exists) {
        const currentBalance = balanceDoc.data()?.amount || 0;
        const updatedBalance = currentBalance + Number(amount);
        
        // Check for insufficient balance if attempting to reduce balance
        if (amount < 0 && updatedBalance < 0) {
          throw new Error(`Insufficient balance: current balance ${currentBalance}, attempted withdrawal ${Math.abs(amount)}`);
        }
        
        transaction.update(balanceRef, {
          amount: updatedBalance,
          lastUpdated: new Date().toISOString(),
        });
        
        return updatedBalance;
      } else {
        // If initial transaction is a withdrawal, prevent it
        if (amount < 0) {
          throw new Error(`Insufficient balance: no balance document exists, attempted withdrawal ${Math.abs(amount)}`);
        }
        
        // Create balance document if it doesn't exist
        const newBalance = {
          amount: Number(amount),
          currency: 'INR',
          lastUpdated: new Date().toISOString(),
        };
        
        transaction.set(balanceRef, newBalance);
        return Number(amount);
      }
    });
    
    return res.json({ success: true, newBalance });
  } catch (error: unknown) {
    console.error('Error updating user balance:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient balance')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to update user balance' });
  }
}; 