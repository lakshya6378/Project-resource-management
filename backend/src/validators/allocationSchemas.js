const { z } = require('zod');

/**
 * Allocation Validation Schemas
 */

const createAllocationSchema = z.object({
  employeeId: z
    .string({ required_error: 'Employee ID is required' })
    .min(1, 'Employee ID is required'),
  projectId: z
    .string({ required_error: 'Project ID is required' })
    .min(1, 'Project ID is required'),
  utilisation: z
    .number({ required_error: 'Utilisation is required' })
    .min(1, 'Utilisation must be at least 1%')
    .max(100, 'Utilisation cannot exceed 100%'),
  fromDate: z
    .string({ required_error: 'From date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid from date'),
  toDate: z
    .string({ required_error: 'To date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid to date'),
});

module.exports = {
  createAllocationSchema,
};
