import { z } from 'zod';
import { ROLES } from '../config/constants';

/**
 * User Management Validation Schemas
 */

const createUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  email: z
    .string()
    .email('Please provide a valid email')
    .trim()
    .toLowerCase(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .trim()
    .toLowerCase(),
  tempPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  roleId: z.string().length(24, 'Invalid role ID format'),
});

const resetPasswordSchema = z.object({
  tempPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export {
  createUserSchema,
  resetPasswordSchema,
};
