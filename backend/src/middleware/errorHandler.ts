/**
 * Global Error Handler Middleware
 *
 * Catches all unhandled errors from routes and middleware.
 * Returns a standardized JSON error response.
 *
 * Handles specific error types:
 *   - Mongoose ValidationError → 400 with field-level details
 *   - Mongoose CastError → 400 (invalid ObjectId format)
 *   - Mongoose duplicate key (code 11000) → 409 Conflict
 *   - JWT errors → 401 (handled in auth.js, fallback here)
 *   - Custom AppError → uses specified status code
 *   - Unknown errors → 500
 *
 * Must be registered LAST in Express middleware chain:
 *   app.use(errorHandler);
 */
const errorHandler = (err: any, req: any, res: any, _next: any) => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // ── Mongoose Validation Error ──────────────────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // ── Mongoose Cast Error (invalid ObjectId) ─────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // ── Mongoose Duplicate Key Error ───────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return res.status(409).json({
      success: false,
      message: `Duplicate value: ${field} '${value}' already exists.`,
    });
  }

  // ── JWT Errors (fallback — primary handling in auth.js) ────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired.',
    });
  }

  // ── Custom AppError ────────────────────────────────────────
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }

  // ── Unknown / Unexpected Error ─────────────────────────────
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message || 'Internal server error',
  });
};

class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export { errorHandler, AppError };
