import { Request, Response } from 'express';
import { auth, db } from '../config/firebase.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    // Validate email domain to only allow gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only Gmail addresses (gmail.com) are allowed to register' });
    }

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
  } catch (error) {
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

    // Validate email domain to only allow gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only Gmail addresses (gmail.com) are allowed to login' });
    }

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
  } catch (error) {
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

    // Validate email domain to only allow gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only Gmail addresses (gmail.com) are allowed to reset password' });
    }

    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);

    // TODO: Send reset email with link
    // For now, just return success
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
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
    
    // Validate email domain to only allow gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only Gmail addresses (gmail.com) are allowed to login as admin' });
    }
    
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
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Failed to login as admin' });
  }
};

export const checkAdminSession = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, timestamp] = decoded.split(':');

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const issuedAt = parseInt(timestamp, 10);
    if (!issuedAt || Date.now() - issuedAt > 24 * 60 * 60 * 1000) {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.json({ email, isAdmin: true });
  } catch (error) {
    console.error('Error verifying admin session:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};