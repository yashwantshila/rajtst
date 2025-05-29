import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase.js';
import { db } from '../config/firebase.js';

// Extend Express Request type to include user
declare module 'express' {
  interface Request {
    user?: {
      uid: string;
      email?: string;
      role?: string;
    };
  }
}

// General user authentication middleware
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No Bearer token found in Authorization header');
      return res.status(401).json({ 
        error: 'No token provided',
        requiresAuth: true
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      console.log('Verifying token with Firebase Admin...');
      const decodedToken = await auth.verifyIdToken(token);
      console.log('Token verified successfully. User ID:', decodedToken.uid);
      
      // Get user from database
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists) {
        console.log('User not found in Firestore:', decodedToken.uid);
        return res.status(404).json({ error: 'User not found' });
      }

      // Add user data to request
      req.user = {
        uid: decodedToken.uid,
        ...userDoc.data()
      };
      
      next();
    } catch (error: any) {
      console.error('Token verification error:', error);
      
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ 
          error: 'Token expired',
          requiresRefresh: true
        });
      }
      
      if (error.code === 'auth/invalid-token') {
        return res.status(401).json({ 
          error: 'Invalid token',
          requiresAuth: true
        });
      }
      
      return res.status(401).json({ 
        error: 'Unauthorized',
        requiresAuth: true
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Authentication failed',
      requiresAuth: true
    });
  }
};

// Admin-specific authentication middleware
export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify Firebase token
      const firebaseToken = await auth.verifyIdToken(token);
      
      // Check if user is admin in Firestore
      const userDoc = await db.collection('users').doc(firebaseToken.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      // Add admin info to request
      req.user = {
        uid: firebaseToken.uid,
        email: firebaseToken.email,
        role: 'admin'
      };
      
      next();
    } catch (error: any) {
      // If token is expired, return 401 with refresh flag
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ 
          error: 'Token expired',
          requiresRefresh: true
        });
      }
      
      // For other token errors, return unauthorized
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}; 