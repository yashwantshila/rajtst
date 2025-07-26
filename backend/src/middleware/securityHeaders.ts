import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const securityHeaders = [
  // Basic Helmet configuration
  helmet(),

  // Custom security headers
  (req: Request, res: Response, next: NextFunction) => {
    // Generate nonce for scripts
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self';" +
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic';` +
      `style-src 'self' 'nonce-${nonce}';` +
      "img-src 'self' data: https:;" +
      "font-src 'self' data:;" +
      "connect-src 'self' https:;" +
      "frame-ancestors 'none';" +
      "form-action 'self';" +
      "object-src 'none';" +
      "base-uri 'none';"
    );

    // Cookie security headers
    if (env.NODE_ENV === 'production') {
      res.setHeader('Set-Cookie', [
        `__Host-session=; Path=/; Secure; HttpOnly; SameSite=Strict`,
        `__Host-csrf=; Path=/; Secure; HttpOnly; SameSite=Strict`
      ]);
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload'
      );
    }

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