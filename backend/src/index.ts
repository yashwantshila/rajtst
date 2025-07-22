import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import './config/firebase.js';

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Middleware
// Configure CORS with specific options
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://raj-test-75qulz.web.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-rtb-fingerprint-id'],
  exposedHeaders: ['x-rtb-fingerprint-id'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

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
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Health check endpoint: /health');
}); 