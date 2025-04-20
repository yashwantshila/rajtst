import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limit configuration for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipFailedRequests: true, // Don't count failed requests
  keyGenerator: (req: Request) => {
    // Use IP + user agent as key to prevent bypassing
    return `${req.ip}-${req.headers['user-agent']}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Rate limit configuration for API routes
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // Use IP + user agent + route as key
    return `${req.ip}-${req.headers['user-agent']}-${req.originalUrl}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Rate limit configuration for admin routes
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per windowMs
  message: 'Too many admin requests, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // Use IP + user agent + admin identifier as key
    const adminId = req.user?.uid || 'unknown';
    return `${req.ip}-${req.headers['user-agent']}-${adminId}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many admin requests',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After')
    });
  }
}); 