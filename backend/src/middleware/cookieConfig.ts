import { Request, Response, NextFunction } from 'express';

export const cookieConfig = {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
  domain: process.env.COOKIE_DOMAIN || undefined
};

export const setCookie = (res: Response, name: string, value: string, options = {}) => {
  res.cookie(name, value, {
    ...cookieConfig,
    ...options
  });
};

export const clearCookie = (res: Response, name: string) => {
  res.clearCookie(name, cookieConfig);
};

export const cookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add cookie security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Ensure cookies are only sent over HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}; 