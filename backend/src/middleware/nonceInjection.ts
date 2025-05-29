import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to expose the CSP nonce to template engines and other middleware
 * This can be used when serving HTML content to inject the nonce into script and style tags
 */
export const nonceInjection = (req: Request, res: Response, next: NextFunction) => {
  // If the response is HTML (for SSR or serving static files)
  res.locals.getNonce = () => {
    return res.locals.nonce || '';
  };
  
  // Override res.send to inject nonce into HTML content if needed
  const originalSend = res.send;
  res.send = function(body) {
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>') && res.locals.nonce) {
      // Add nonce meta tag to head for frontend JavaScript to access
      const headTagEnd = body.indexOf('</head>');
      if (headTagEnd !== -1) {
        const metaTag = `<meta name="csp-nonce" content="${res.locals.nonce}" />`;
        body = body.slice(0, headTagEnd) + metaTag + body.slice(headTagEnd);
      }
      
      // Replace script and style tags with nonce attribute
      body = body.replace(/<script(?![^>]*nonce=)/g, `<script nonce="${res.locals.nonce}"`);
      body = body.replace(/<style(?![^>]*nonce=)/g, `<style nonce="${res.locals.nonce}"`);
    }
    return originalSend.call(this, body);
  };
  
  next();
}; 