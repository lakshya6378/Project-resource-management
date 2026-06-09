import userService from '../services/UserService';
import { sendSuccess, sendError } from '../utils/responseHelper';

/**
 * AdminUserController — Request Handlers for Admin User Management
 *
 * Thin controller — delegates all logic to UserService.
 * Handles request extraction, calls service, returns standardized response.
 */
class AdminUserController {
  /**
   * POST /api/admin/users
   * Body: { fullName, email, username, tempPassword, role }
   */
  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body, req.user.id);

      // Send welcome email with credentials
      const emailService = require('../services/EmailService').default;
      emailService.sendAccountCredentialsEmail(user, req.body.tempPassword).catch(console.error);

      sendSuccess(res, user, 'User account created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users
   * Returns all users with counts (total/active/inactive)
   */
  async listUsers(req, res, next) {
    try {
      const result = await userService.listUsers();
      sendSuccess(res, result, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id/deactivate
   */
  async deactivateUser(req, res, next) {
    try {
      const user = await userService.deactivateUser(req.params.id, req.user.id);
      sendSuccess(res, user, 'User account deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id/reactivate
   */
  async reactivateUser(req, res, next) {
    try {
      const user = await userService.reactivateUser(req.params.id);
      sendSuccess(res, user, 'User account reactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/reset-password
   * Body: { tempPassword }
   */
  async resetPassword(req, res, next) {
    try {
      const result = await userService.resetPassword(req.params.id, req.body.tempPassword);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminUserController();
