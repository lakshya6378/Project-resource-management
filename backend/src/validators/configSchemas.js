const { z } = require('zod');
const { LLM_PROVIDERS } = require('../config/constants');

/**
 * System Configuration Validation Schema
 */

const updateConfigSchema = z.object({
  llmProvider: z.enum(Object.values(LLM_PROVIDERS), {
    invalid_type_error: `Provider must be one of: ${Object.values(LLM_PROVIDERS).join(', ')}`,
  }).optional(),
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

module.exports = { updateConfigSchema };
