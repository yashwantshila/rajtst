import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { auth } from '../config/firebase.js';
import { spawn } from 'child_process';
import path from 'path';

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

// --- WordPress Automator Script Handling ---
let automatorStatus: 'idle' | 'running' | 'completed' | 'error' = 'idle';
let automatorError = '';
let currentProcess: ReturnType<typeof spawn> | null = null;

export const runWordpressAutomator = (req: Request, res: Response) => {
  if (automatorStatus === 'running') {
    return res.status(400).json({ error: 'Automator already running' });
  }

  const scriptPath = path.join(process.cwd(), 'backend', 'scripts', 'wordpress_automator.py');

  automatorStatus = 'running';
  automatorError = '';

  currentProcess = spawn('python3', [scriptPath], { env: process.env });

  currentProcess.on('close', code => {
    automatorStatus = code === 0 ? 'completed' : 'error';
    if (code !== 0) {
      automatorError = `Process exited with code ${code}`;
    }
    currentProcess = null;
  });

  currentProcess.stderr?.on('data', data => {
    automatorError = data.toString();
  });

  res.json({ message: 'Automator started' });
};

export const getAutomatorStatus = (_req: Request, res: Response) => {
  res.json({ status: automatorStatus, error: automatorError });
};