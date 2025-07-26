import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import routes from './routes/index.js';
import './config/firebase.js';
import { scheduleDailyChallengeCleanup } from './scheduler/cleanupEntries.js';

// Load environment variables
dotenv.config();

const app = express();
const port = env.PORT;

// Middleware
// Configure CORS with specific options
app.use(cors({
  origin: env.FRONTEND_URL || 'https://raj-test-75qulz.web.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-rtb-fingerprint-id'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));
app.use(helmet());
app.use(morgan('dev'));
// Parse Razorpay webhook requests as raw body before JSON parsing
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Schedule daily cleanup of expired challenge entries
scheduleDailyChallengeCleanup();

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment:', env.NODE_ENV);
  console.log('Health check endpoint: /health');
}); 