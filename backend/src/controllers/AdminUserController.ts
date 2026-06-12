import userService from '../services/UserService';
import { sendSuccess } from '../utils/responseHelper';
import { Role } from '../models';

class AdminUserController {
  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body, req.user.id);
      sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listRoles(req, res, next) {
    try {
      const roles = await Role.find();
      sendSuccess(res, roles, 'Roles fetched successfully');
    } catch (error) {
      next(error);
    }
  }
  async listUsers(req, res, next) {
    try {
      const result = await userService.listUsers();
      sendSuccess(res, result, 'Users fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.deactivateUser(id, req.user.id);
      sendSuccess(res, user, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  async reactivateUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.reactivateUser(id);
      sendSuccess(res, user, 'User reactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { tempPassword } = req.body;
      const result = await userService.resetPassword(id, tempPassword);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminUserController();
