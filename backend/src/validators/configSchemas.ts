import { z } from 'zod';
import { LLM_PROVIDERS } from '../config/constants';

/**
 * System Configuration Validation Schema
 */

const updateConfigSchema = z.object({
  llmProvider: z.enum(Object.values(LLM_PROVIDERS) as [string, ...string[]]).optional(),
  llmApiKey: z.string().optional(),
  schedulerIntervalHours: z
    .number()
    .min(1, 'Must be at least 1 hour')
    .optional(),
  maxWeeklyHours: z
    .number()
    .min(1, 'Must be at least 1')
    .max(168, 'Cannot exceed 168 hours per week')
    .optional(),
});

export { updateConfigSchema };
