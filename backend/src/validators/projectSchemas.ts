import { z } from 'zod';
import { PROJECT_STATUS, MILESTONE_STATUS } from '../config/constants';

/**
 * Project Management Validation Schemas
 */

const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters')
    .trim(),
  description: z.string().trim().optional().default(''),
  managerId: z
    .string()
    .min(1, 'Manager ID is required'),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  totalStoryPoints: z.number().min(0).optional().default(0),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).trim().optional(),
  description: z.string().trim().optional(),
  managerId: z.string().min(1).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
  status: z.enum(Object.values(PROJECT_STATUS) as [string, ...string[]]).optional(),
  totalStoryPoints: z.number().min(0).optional(),
});

const addMilestoneSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .trim(),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid due date'),
  storyPoints: z.number().min(0).optional().default(0),
});

const updateMilestoneSchema = z.object({
  status: z.enum(Object.values(MILESTONE_STATUS) as [string, ...string[]]),
});

export {
  createProjectSchema,
  updateProjectSchema,
  addMilestoneSchema,
  updateMilestoneSchema,
};
