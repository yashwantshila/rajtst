import { Request, Response, NextFunction } from 'express';
// Admin authentication via a simple backend-issued token

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

export const verifyFirebaseAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    req.admin = {
      uid: 'admin',
      email,
      isAdmin: true,
    };

    return next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
