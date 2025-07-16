import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { auth } from '../config/firebase.js';

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map((doc: any) => ({
      uid: doc.id,
      ...doc.data()
    }));
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get all user balances
export const getAllBalances = async (req: Request, res: Response) => {
  try {
    const balancesSnapshot = await db.collection('balance').get();
    const balances = balancesSnapshot.docs.map((doc: any) => ({
      userId: doc.id,
      amount: doc.data().amount || 0
    }));
    res.json(balances);
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
};

// Update user role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { uid, role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update in Firebase Auth
    await auth.setCustomUserClaims(uid, { role });
    
    // Update in Firestore
    await db.collection('users').doc(uid).update({ role });
    
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Return the authenticated admin's status
export const getAdminStatus = (req: Request, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      isAdmin: true,
      uid: req.admin.uid,
      email: req.admin.email
    });
  } catch (error) {
    console.error('Error getting admin status:', error);
    res.status(500).json({ error: 'Failed to get admin status' });
  }
};