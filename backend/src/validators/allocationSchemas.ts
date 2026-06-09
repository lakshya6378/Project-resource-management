import { z } from 'zod';

/**
 * Allocation Validation Schemas
 */

const createAllocationSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required'),
  projectId: z
    .string()
    .min(1, 'Project ID is required'),
  utilisation: z
    .number()
    .min(1, 'Utilisation must be at least 1%')
    .max(100, 'Utilisation cannot exceed 100%'),
  fromDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid from date'),
  toDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid to date'),
});

export {
  createAllocationSchema,
};
