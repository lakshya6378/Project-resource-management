/**
 * Response Helper
 *
 * Standardized JSON response builders for consistent API output.
 * Every API response follows the same structure:
 *   { success: boolean, message?: string, data?: any, errors?: any[] }
 *
 * DRY principle: avoids repeating res.status().json() patterns
 * across 30+ controller methods.
 */

/**
 * Send a success response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Response payload
 * @param {string} [message='Success'] - Success message
 * @param {number} [statusCode=200] - HTTP status code
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = { success: true, message };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send an error response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} [statusCode=400] - HTTP status code
 * @param {Array} [errors=[]] - Detailed error list (field-level)
 */
const sendError = (res, message = 'An error occurred', statusCode = 400, errors = []) => {
  const response = { success: false, message };

  if (errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
