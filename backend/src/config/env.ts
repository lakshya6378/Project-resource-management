import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment configuration schema.
 * Validates and provides typed access to all env vars.
 * Follows Fail Fast principle — crashes on startup if required vars are missing.
 */
const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MongoDB
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // JWT
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_EXPIRY: z.string().default('24h'),

  // LLM
  LLM_PROVIDER: z.enum(['GEMINI', 'GROQ', 'LOCAL_GEMMA']).default('GEMINI'),
  LLM_API_KEY: z.string().default(''),

  // Scheduler
  SCHEDULER_INTERVAL_HOURS: z.coerce.number().positive().default(4),

  // Business Rules
  MAX_WEEKLY_HOURS: z.coerce.number().positive().default(40),
  TIMESHEET_HISTORY_WEEKS: z.coerce.number().positive().default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  console.error(parsed.error.format());
  process.exit(1);
}

export default Object.freeze(parsed.data);
