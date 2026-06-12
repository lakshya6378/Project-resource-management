import mongoose from 'mongoose';
import { LLM_PROVIDERS } from '../config/constants';

/**
 * SystemConfig Schema — Singleton Document
 *
 * Stores application-wide configuration. Only ONE document exists
 * in this collection. Admin can update it via the System Configuration screen.
 *
 * Fields:
 *   - llmProvider: Which AI provider to use (Gemini or Groq)
 *   - llmApiKey: API key for the selected provider (stored as-is; encrypt in production)
 *   - schedulerIntervalHours: How often the background scheduler runs
 *   - maxWeeklyHours: Maximum hours an employee can log per week
 */
const systemConfigSchema = new mongoose.Schema(
  {
    llmProvider: {
      type: String,
      enum: {
        values: Object.values(LLM_PROVIDERS),
        message: 'LLM provider must be one of: GEMINI, GROQ, LOCAL_GEMMA',
      },
      default: LLM_PROVIDERS.GEMINI,
    },
    llmApiKey: {
      type: String,
      default: '',
    },
    schedulerIntervalHours: {
      type: Number,
      default: 4,
      min: [1, 'Scheduler interval must be at least 1 hour'],
    },
    maxWeeklyHours: {
      type: Number,
      default: 40,
      min: [1, 'Max weekly hours must be at least 1'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Transform: Clean JSON output ────────────────────────────
systemConfigSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('SystemConfig', systemConfigSchema);
