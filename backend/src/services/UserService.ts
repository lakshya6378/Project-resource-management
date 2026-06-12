import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { ROLES } from '../config/constants';
import { ERROR_MESSAGES } from '../config/errorMessages';

class UserService {
  async createUser(dto, createdById) {
    const { fullName, email, username, tempPassword, roleId } = dto;

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      throw new AppError(ERROR_MESSAGES.USERNAME_EXISTS, 409);
    }

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw new AppError(ERROR_MESSAGES.EMAIL_EXISTS, 409);
    }

    const { Role } = require('../models');
    const roleExists = await Role.findById(roleId);
    if (!roleExists) {
      throw new AppError(ERROR_MESSAGES.INVALID_ROLE_ID, 400);
    }

    const user = await userRepository.create({
      fullName,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash: tempPassword, // pre-save hook will hash this
      roleId,
      isActive: true,
      forcePasswordChange: true,
      createdBy: createdById,
    });

    // Send welcome email with credentials
    const emailService = require('./EmailService').default;
    await emailService.sendAccountCredentialsEmail(user, tempPassword);

    return user;
  }

  /**
   * List all user accounts with counts.
   *
   * @returns {{ users: Object[], counts: { total, active, inactive } }}
   */
  async listUsers() {
    const users = await userRepository.findAll();
    const counts = await userRepository.countByStatus();

    return { users, counts };
  }

  /**
   * Deactivate a user account.
   *
   * Business rules:
   *   - Cannot deactivate yourself
   *   - Sets isActive = false
   *   - User can no longer log in
   *   - Does NOT automatically deactivate linked employee
   *     (that's a separate admin action)
   *
   * @param {string} userId - ID of user to deactivate
   * @param {string} adminId - ID of admin performing the action
   */
  async deactivateUser(userId, adminId) {
    if (userId === adminId.toString()) {
      throw new AppError('You cannot deactivate your own account', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive) {
      throw new AppError('User is already deactivated', 400);
    }

    const updated = await userRepository.update(userId, { isActive: false });
    return updated;
  }

  /**
   * Reactivate a previously deactivated user account.
   *
   * Business rules:
   *   - Only works on inactive users
   *   - Does NOT restore any employee allocations
   *
   * @param {string} userId - ID of user to reactivate
   */
  async reactivateUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isActive) {
      throw new AppError('User is already active', 400);
    }

    const updated = await userRepository.update(userId, { isActive: true });
    return updated;
  }

  /**
   * Reset a user's password.
   *
   * Business rules:
   *   - Sets a new temporary password
   *   - Forces password change on next login
   *
   * @param {string} userId - ID of user
   * @param {string} tempPassword - New temporary password
   */
  async resetPassword(userId, tempPassword) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Use the model's pre-save hook to hash the password
    user.passwordHash = tempPassword;
    user.forcePasswordChange = true;
    await user.save();

    return { message: 'Password reset successfully. User must change password on next login.' };
  }
}

export default new UserService();
