import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all user balances
export const getAllBalances = async (req: Request, res: Response) => {
  try {
    const balancesSnapshot = await db.collection('balance').get();
    const balances = balancesSnapshot.docs.map(doc => ({
      userId: doc.id,
      amount: doc.data().amount || 0
    }));
    res.json(balances);
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user's role
    await db.collection('users').doc(userId).update({ role });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 