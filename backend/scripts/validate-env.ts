import { validateEnv } from '../src/config/env';

console.log('🔍 Validating environment variables...');

try {
  validateEnv();
  console.log('✅ Environment variables are valid!');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
} 