import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { authLimiter, apiLimiter, adminLimiter } from './middleware/rateLimit.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { nonceInjection } from './middleware/nonceInjection.js';
import './config/firebase.js'; // Initialize Firebase

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Enable gzip compression for better performance
app.use(compression());

// --- Trust the proxy to get the real client IP address ---
// This is crucial for environments like Google Cloud Run.
// Setting it to '1' trusts the first hop from the proxy.
app.set('trust proxy', 1);

// --- Security and Logging Middleware ---
app.use(helmet()); // Apply general security headers
app.use(morgan('dev')); // Enable request logging for development

// Apply custom security headers from your middleware
securityHeaders.forEach((middleware: express.RequestHandler) => app.use(middleware));

// Apply nonce injection middleware
app.use(nonceInjection);

// --- CORS Configuration ---
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://raj-test-75qulz.web.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-rtb-fingerprint-id'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// --- Body and Cookie Parsers ---
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Rate Limiting ---
app.use('/api/auth', authLimiter); // Stricter limits for auth routes
app.use('/api/admin', adminLimiter); // Admin-specific limits
app.use('/api', apiLimiter); // General API limits

// --- Application Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Centralized Error Handling ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// --- Start Server ---
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

export default app;