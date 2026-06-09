import { z } from 'zod';
import { SKILL_CATEGORIES, PROFICIENCY_LEVELS } from '../config/constants';

/**
 * Employee Management Validation Schemas
 */

const createEmployeeSchema = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required'),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  email: z
    .string()
    .email('Please provide a valid email')
    .trim()
    .toLowerCase(),
  department: z
    .string()
    .min(1, 'Department is required')
    .trim(),
  designation: z
    .string()
    .min(1, 'Designation is required')
    .trim(),
});

const updateEmployeeSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim().optional(),
  department: z.string().min(1, 'Department is required').trim().optional(),
  designation: z.string().min(1, 'Designation is required').trim().optional(),
});

const addSkillSchema = z.object({
  name: z
    .string()
    .min(1, 'Skill name is required')
    .trim(),
  category: z.enum(Object.values(SKILL_CATEGORIES) as [string, ...string[]]),
  proficiency: z.enum(Object.values(PROFICIENCY_LEVELS) as [string, ...string[]]),
});

const updateSkillSchema = z.object({
  proficiency: z.enum(Object.values(PROFICIENCY_LEVELS) as [string, ...string[]]),
});

export {
  createEmployeeSchema,
  updateEmployeeSchema,
  addSkillSchema,
  updateSkillSchema,
};
