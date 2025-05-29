import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { authLimiter, apiLimiter, adminLimiter } from './middleware/rateLimit.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { nonceInjection } from './middleware/nonceInjection.js';
import cookieParser from 'cookie-parser';

const app = express();

// Apply security headers
securityHeaders.forEach((middleware: express.RequestHandler) => app.use(middleware));

// Apply nonce injection middleware
app.use(nonceInjection);

// Configure CORS with specific options
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://raj-test-75qulz.web.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-rtb-fingerprint-id'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Add cookie parser middleware
app.use(cookieParser());

app.use(express.json());

// Apply rate limiting
app.use('/api/auth', authLimiter); // Stricter limits for auth routes
app.use('/api/admin', adminLimiter); // Admin-specific limits
app.use('/api', apiLimiter); // General API limits

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app; 