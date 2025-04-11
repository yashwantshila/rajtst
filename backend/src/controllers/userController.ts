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