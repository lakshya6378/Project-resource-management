import { z } from 'zod';
import { SKILL_CATEGORIES, PROFICIENCY_LEVELS } from '../config/constants';

/**
 * Employee Management Validation Schemas
 */

const createEmployeeSchema = z.object({
  userId: z.string().length(24, 'Invalid User ID format'),
  departmentId: z.string().length(24, 'Invalid Department ID format'),
  designationId: z.string().length(24, 'Invalid Designation ID format'),
});

const updateEmployeeSchema = z.object({
  departmentId: z.string().length(24, 'Invalid Department ID format').optional(),
  designationId: z.string().length(24, 'Invalid Designation ID format').optional(),
});

const addSkillSchema = z.object({
  skillId: z.string().length(24, 'Invalid Skill ID format'),
  proficiency: z.enum(Object.values(PROFICIENCY_LEVELS) as [string, ...string[]]),
});

const updateSkillSchema = z.object({
  proficiency: z.enum(Object.values(PROFICIENCY_LEVELS) as [string, ...string[]]),
});

const assignManagerSchema = z.object({
  managerId: z.string().min(1, 'Manager ID is required'),
});

export {
  createEmployeeSchema,
  updateEmployeeSchema,
  addSkillSchema,
  updateSkillSchema,
  assignManagerSchema,
};
