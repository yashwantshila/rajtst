import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

export const securityHeaders = [
  // Basic Helmet configuration
  helmet(),

  // Custom security headers
  (req: Request, res: Response, next: NextFunction) => {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self';" +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval';" +
      "style-src 'self' 'unsafe-inline';" +
      "img-src 'self' data: https:;" +
      "font-src 'self' data:;" +
      "connect-src 'self' https:;" +
      "frame-ancestors 'none';" +
      "form-action 'self';"
    );

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    // Cross-Origin Embedder Policy
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cross-Origin Opener Policy
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin Resource Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    next();
  }
]; 