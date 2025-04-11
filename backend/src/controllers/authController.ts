import { Request, Response } from 'express';
import { auth, db } from '../config/firebase.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: username,
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      username,
      createdAt: new Date().toISOString(),
    });

    // Create balance document
    await db.collection('balance').doc(userRecord.uid).set({
      amount: 0,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    });

    // Generate custom token
    const token = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      token,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        username: username,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-exists') {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Sign in with Firebase Admin SDK
    const userRecord = await auth.getUserByEmail(email);
    
    // Generate custom token
    const token = await auth.createCustomToken(userRecord.uid);

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    res.json({
      token,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        username: userData?.username,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.code === 'auth/user-not-found') {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      res.status(500).json({ error: 'Failed to login' });
    }
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);

    // TODO: Send reset email with link
    // For now, just return success
    res.json({ message: 'Password reset email sent' });
  } catch (error: any) {
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to process password reset' });
    }
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Check against environment variables
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Generate a simple token (in production, use a proper JWT)
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      
      res.json({
        success: true,
        isAdmin: true,
        email: process.env.ADMIN_EMAIL,
        token: token
      });
    } else {
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Failed to login as admin' });
  }
}; 