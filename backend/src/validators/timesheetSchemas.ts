import { z } from 'zod';

/**
 * Timesheet Validation Schemas
 */

const timesheetEntrySchema = z.object({
  projectId: z
    .string()
    .min(1, 'Project ID is required'),
  hours: z
    .number()
    .min(0, 'Hours cannot be negative'),
  activityTags: z.array(z.string()).optional().default([]),
});

const submitTimesheetSchema = z.object({
  weekStart: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid week start date'),
  entries: z
    .array(timesheetEntrySchema)
    .min(1, 'At least one timesheet entry is required'),
});

const requestAccessSchema = z.object({
  weekStart: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid week start date'),
  reason: z
    .string()
    .min(5, 'Please provide a valid reason (min 5 characters)')
    .trim(),
});

const reviewAccessSchema = z.object({
  approved: z.boolean(),
});

export {
  submitTimesheetSchema,
  requestAccessSchema,
  reviewAccessSchema,
};
