const { z } = require('zod');
const { PROJECT_STATUS, MILESTONE_STATUS } = require('../config/constants');

/**
 * Project Management Validation Schemas
 */

const createProjectSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .min(2, 'Project name must be at least 2 characters')
    .trim(),
  description: z.string().trim().optional().default(''),
  managerId: z
    .string({ required_error: 'Manager ID is required' })
    .min(1, 'Manager ID is required'),
  startDate: z
    .string({ required_error: 'Start date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string({ required_error: 'End date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).trim().optional(),
  description: z.string().trim().optional(),
  managerId: z.string().min(1).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
  status: z.enum(Object.values(PROJECT_STATUS), {
    invalid_type_error: `Status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`,
  }).optional(),
});

const addMilestoneSchema = z.object({
  title: z
    .string({ required_error: 'Milestone title is required' })
    .min(1, 'Title is required')
    .trim(),
  dueDate: z
    .string({ required_error: 'Due date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid due date'),
});

const updateMilestoneSchema = z.object({
  status: z.enum(Object.values(MILESTONE_STATUS), {
    required_error: 'Milestone status is required',
    invalid_type_error: `Status must be one of: ${Object.values(MILESTONE_STATUS).join(', ')}`,
  }),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  addMilestoneSchema,
  updateMilestoneSchema,
};
