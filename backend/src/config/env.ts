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

  // Admin Configuration
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  // Payment Gateway Configuration
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),

  // Security Configuration
  JWT_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),

  // Database Configuration
  MONGODB_URI: z.string().url(),

  // CORS Configuration
  CORS_ORIGIN: z.string().url(),

  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
});

// Validate environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
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