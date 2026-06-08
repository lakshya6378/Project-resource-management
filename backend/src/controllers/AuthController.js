const authService = require('../services/AuthService');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * AuthController — Request Handlers for Authentication
 *
 * Thin controller layer — delegates all logic to AuthService.
 * Only responsible for extracting request data and sending responses.
 */
class AuthController {
  /**
   * POST /api/auth/login
   * Body: { username, password }
   * Returns: { token, user: { id, username, fullName, role, forcePasswordChange } }
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password
   * Body: { currentPassword, newPassword }
   * Requires: verifyToken middleware (user must be authenticated)
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Requires: verifyToken middleware (user must be authenticated)
   * Blacklists the current JWT token
   */
  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.token);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
