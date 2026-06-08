const { z } = require('zod');
const { ROLES } = require('../config/constants');

/**
 * User Management Validation Schemas
 */

const createUserSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email')
    .trim()
    .toLowerCase(),
  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .trim()
    .toLowerCase(),
  tempPassword: z
    .string({ required_error: 'Temporary password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be one of: ADMIN, MANAGER, EMPLOYEE',
  }),
});

const resetPasswordSchema = z.object({
  tempPassword: z
    .string({ required_error: 'Temporary password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

module.exports = {
  createUserSchema,
  resetPasswordSchema,
};
