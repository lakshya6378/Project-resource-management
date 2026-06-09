import { userRepository } from '../repositories';
import { generateToken, blacklistToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

/**
 * AuthService — Authentication Business Logic
 *
 * Handles login, password change, and logout operations.
 * Separated from controllers to keep business rules testable.
 */
class AuthService {
  /**
   * Authenticate a user and return a JWT token.
   *
   * @param {string} username
   * @param {string} password
   * @returns {{ token: string, user: Object }} JWT token and user info
   * @throws {AppError} If credentials are invalid or account is inactive
   */
  async login(username, password) {
    // findByUsername returns the full document including passwordHash
    const user = await userRepository.findByUsername(username);

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Contact your administrator.', 401);
    }

    const isMatch = await (user as any).comparePassword(password);

    if (!isMatch) {
      throw new AppError('Invalid username or password', 401);
    }

    const token = generateToken(user);

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        forcePasswordChange: user.forcePasswordChange,
      },
    };
  }

  /**
   * Change a user's password.
   * Used both for forced first-login changes and voluntary changes.
   *
   * @param {string} userId - ID of the authenticated user
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   * @throws {AppError} If current password is wrong or new password matches old
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isMatch = await (user as any).comparePassword(currentPassword);

    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Prevent reusing the same password
    if (currentPassword === newPassword) {
      throw new AppError('New password must be different from the current password', 400);
    }

    // Update password — the pre-save hook will hash it
    user.passwordHash = newPassword;
    user.forcePasswordChange = false;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  /**
   * Logout a user by blacklisting their current token.
   *
   * @param {string} token - JWT token to invalidate
   */
  async logout(token) {
    blacklistToken(token);
    return { message: 'Logged out successfully' };
  }
}

export default new AuthService();
