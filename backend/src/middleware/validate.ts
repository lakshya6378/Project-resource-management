/**
 * Validation Middleware Factory
 *
 * Creates Express middleware that validates req.body against a Zod schema.
 * Returns 400 with structured error details if validation fails.
 *
 * Follows Fail Fast principle — rejects invalid requests immediately
 * before they reach controllers or services.
 *
 * Usage in routes:
 *   import { createUserSchema } from '../validators/userSchemas';
 *   router.post('/users', validate(createUserSchema), controller.createUser);
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const rawErrors = result.error?.errors || result.error?.issues || [];
        const errors = rawErrors.map((err) => ({
          field: err.path ? err.path.join('.') : 'unknown',
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }

      // Replace req.body with the parsed (and potentially transformed) data
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate query parameters against a Zod schema.
 * Same pattern as body validation but for req.query.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Query parameter validation failed',
          errors,
        });
      }

      req.query = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate route params against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Route parameter validation failed',
          errors,
        });
      }

      req.params = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export { validate, validateQuery, validateParams };
