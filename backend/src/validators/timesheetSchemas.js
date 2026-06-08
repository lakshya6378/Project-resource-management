const { z } = require('zod');

/**
 * Timesheet Validation Schemas
 */

const timesheetEntrySchema = z.object({
  projectId: z
    .string({ required_error: 'Project ID is required' })
    .min(1, 'Project ID is required'),
  hours: z
    .number({ required_error: 'Hours are required' })
    .min(0, 'Hours cannot be negative'),
  activityTags: z.array(z.string()).optional().default([]),
});

const submitTimesheetSchema = z.object({
  weekStart: z
    .string({ required_error: 'Week start date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid week start date'),
  entries: z
    .array(timesheetEntrySchema)
    .min(1, 'At least one timesheet entry is required'),
});

module.exports = {
  submitTimesheetSchema,
};
