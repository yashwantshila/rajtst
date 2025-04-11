import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';

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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Admin-specific authentication middleware
export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Check if it's a custom admin token
    const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    const [email, timestamp] = decodedToken.split(':');
    
    if (email === process.env.ADMIN_EMAIL) {
      // Token is valid if it's for the admin email
      req.user = {
        uid: 'admin',
        email: process.env.ADMIN_EMAIL,
        role: 'admin'
      };
      return next();
    }

    // Otherwise, verify Firebase token
    const firebaseToken = await auth.verifyIdToken(token);
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(firebaseToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Add user info to request
    req.user = {
      uid: firebaseToken.uid,
      email: firebaseToken.email,
      role: userDoc.data()?.role
    };
    
    next();
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}; 