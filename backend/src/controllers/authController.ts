import { Request, Response } from 'express';
import { auth, db } from '../config/firebase.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

    // Validate email domain to only allow gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only Gmail addresses (gmail.com) are allowed to reset password' });
    }

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
    
    // Validate email domain to only allow gmail.com
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only Gmail addresses (gmail.com) are allowed to login as admin' });
    }
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminHash = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret = process.env.JWT_SECRET || '';

    let passwordMatch = false;
    if (adminHash) {
      passwordMatch = await bcrypt.compare(password, adminHash);
    } else if (adminPassword) {
      passwordMatch = password === adminPassword;
    }

    if (email === adminEmail && passwordMatch) {
      const token = jwt.sign(
        { email: adminEmail, role: 'admin' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      res.json({
        success: true,
        isAdmin: true,
        email: adminEmail,
        token
      });
    } else {
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Failed to login as admin' });
  }
}; 