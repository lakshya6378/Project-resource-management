import { z } from 'zod';

/**
 * Auth Request Validation Schemas
 *
 * Used with the validate() middleware to ensure request bodies
 * meet requirements before reaching the controller/service layer.
 */

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});

export {
  loginSchema,
  changePasswordSchema,
};
