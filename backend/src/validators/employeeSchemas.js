const { z } = require('zod');
const { SKILL_CATEGORIES, PROFICIENCY_LEVELS } = require('../config/constants');

/**
 * Employee Management Validation Schemas
 */

const createEmployeeSchema = z.object({
  userId: z
    .string({ required_error: 'User ID is required' })
    .min(1, 'User ID is required'),
  fullName: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email')
    .trim()
    .toLowerCase(),
  department: z
    .string({ required_error: 'Department is required' })
    .min(1, 'Department is required')
    .trim(),
  designation: z
    .string({ required_error: 'Designation is required' })
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
    .string({ required_error: 'Skill name is required' })
    .min(1, 'Skill name is required')
    .trim(),
  category: z.enum(Object.values(SKILL_CATEGORIES), {
    required_error: 'Skill category is required',
    invalid_type_error: `Category must be one of: ${Object.values(SKILL_CATEGORIES).join(', ')}`,
  }),
  proficiency: z.enum(Object.values(PROFICIENCY_LEVELS), {
    required_error: 'Proficiency level is required',
    invalid_type_error: `Proficiency must be one of: ${Object.values(PROFICIENCY_LEVELS).join(', ')}`,
  }),
});

const updateSkillSchema = z.object({
  proficiency: z.enum(Object.values(PROFICIENCY_LEVELS), {
    required_error: 'Proficiency level is required',
    invalid_type_error: `Proficiency must be one of: ${Object.values(PROFICIENCY_LEVELS).join(', ')}`,
  }),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  addSkillSchema,
  updateSkillSchema,
};
