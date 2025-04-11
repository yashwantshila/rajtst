import { z } from 'zod';

// Define environment schema
const envSchema = z.object({
  // API Configuration
  VITE_API_URL: z.string().url(),

  // Firebase Configuration
  VITE_FIREBASE_API_KEY: z.string(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string(),
  VITE_FIREBASE_PROJECT_ID: z.string(),
  VITE_FIREBASE_STORAGE_BUCKET: z.string(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string(),
  VITE_FIREBASE_APP_ID: z.string(),

  // Payment Gateway Configuration
  VITE_RAZORPAY_KEY_ID: z.string(),

  // Feature Flags
  VITE_ENABLE_ANALYTICS: z.string().transform((val) => val === 'true'),
  VITE_ENABLE_DEBUG_MODE: z.string().transform((val) => val === 'true'),

  // App Configuration
  VITE_APP_NAME: z.string(),
  VITE_APP_VERSION: z.string(),
});

// Validate environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.errors);
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
};

// Export validated environment variables
export const env = validateEnv();

// Type for environment variables
export type Env = z.infer<typeof envSchema>;

// Helper function to check if analytics is enabled
export const isAnalyticsEnabled = () => env.VITE_ENABLE_ANALYTICS;

// Helper function to check if debug mode is enabled
export const isDebugMode = () => env.VITE_ENABLE_DEBUG_MODE; 