import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define environment schema
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Firebase Configuration
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_API_KEY: z.string(),

  // Admin Configuration
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  // Payment Gateway Configuration
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),

  // Security Configuration
  JWT_SECRET: z.string().min(32),

  

  

  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Cookie Configuration
  COOKIE_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().optional(),
  FRONTEND_URL: z.string().url(),
});

// Validate environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.errors);
      process.exit(1);
    }
    throw error;
  }
};

// Export validated environment variables
export const env = validateEnv();

// Type for environment variables
export type Env = z.infer<typeof envSchema>;

// Helper function to check if in production
export const isProduction = () => env.NODE_ENV === 'production';

// Helper function to check if in development
export const isDevelopment = () => env.NODE_ENV === 'development';

// Helper function to check if in test
export const isTest = () => env.NODE_ENV === 'test';

// Export additional environment variables
export const cookieSecret = env.COOKIE_SECRET || 'your-secret-key';
export const cookieDomain = env.COOKIE_DOMAIN;
export const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173'; 