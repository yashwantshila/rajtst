import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase.js';

// Extend Express Request type to include admin user
declare module 'express' {
  interface Request {
    admin?: {
      uid: string;
      email?: string;
      isAdmin: boolean;
    };
  }
}

export const verifyFirebaseAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user from database
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Add user data to request
    req.admin = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: true
    };
    
    next();
  } catch (error: any) {
    console.error('Firebase admin authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    
    if (error.code === 'auth/invalid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(401).json({ error: 'Unauthorized' });
  }
}; 