import authService from '../../../src/services/AuthService';
import { userRepository } from '../../../src/repositories';
import * as authMiddleware from '../../../src/middleware/auth';
import { AppError } from '../../../src/middleware/errorHandler';
import { ERROR_MESSAGES } from '../../../src/config/errorMessages';

// Mock dependencies
jest.mock('../../../src/repositories', () => ({
  userRepository: {
    findByUsername: jest.fn(),
    findByIdWithPassword: jest.fn(),
  },
}));

jest.mock('../../../src/middleware/auth', () => ({
  generateToken: jest.fn(),
  blacklistToken: jest.fn(),
}));

jest.mock('../../../src/models', () => ({
  RolePermission: {
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue([]),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockUser = {
      _id: 'user_id',
      username: 'johndoe',
      fullName: 'John Doe',
      isActive: true,
      roleId: { _id: 'role_id', name: 'EMPLOYEE' },
      forcePasswordChange: false,
      comparePassword: jest.fn(),
    };

    it('should return a token and user info on successful login', async () => {
      mockUser.comparePassword.mockResolvedValue(true);
      (userRepository.findByUsername as jest.Mock).mockResolvedValue(mockUser);
      (authMiddleware.generateToken as jest.Mock).mockReturnValue('mocked_jwt_token');

      const result = await authService.login('johndoe', 'password123');

      expect(userRepository.findByUsername).toHaveBeenCalledWith('johndoe');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(authMiddleware.generateToken).toHaveBeenCalledWith({
        id: 'user_id',
        username: 'johndoe',
        role: 'EMPLOYEE',
      });
      expect(result).toEqual({
        token: 'mocked_jwt_token',
        user: {
          id: 'user_id',
          username: 'johndoe',
          fullName: 'John Doe',
          role: 'EMPLOYEE',
          permissions: [],
          forcePasswordChange: false,
        },
      });
    });

    it('should throw error if user is not found', async () => {
      (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('johndoe', 'password123')).rejects.toThrow(AppError);
      await expect(authService.login('johndoe', 'password123')).rejects.toMatchObject({
        statusCode: 401,
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
    });

    it('should throw error if user is inactive', async () => {
      (userRepository.findByUsername as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

      await expect(authService.login('johndoe', 'password123')).rejects.toThrow(AppError);
      await expect(authService.login('johndoe', 'password123')).rejects.toMatchObject({
        statusCode: 401,
        message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED,
      });
    });

    it('should throw error if password does not match', async () => {
      mockUser.comparePassword.mockResolvedValue(false);
      (userRepository.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login('johndoe', 'wrongpassword')).rejects.toThrow(AppError);
      await expect(authService.login('johndoe', 'wrongpassword')).rejects.toMatchObject({
        statusCode: 401,
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      _id: 'user_id',
      passwordHash: 'oldHash',
      forcePasswordChange: true,
      comparePassword: jest.fn(),
      save: jest.fn(),
    };

    it('should change password successfully', async () => {
      mockUser.comparePassword.mockResolvedValue(true);
      mockUser.save.mockResolvedValue(mockUser);
      (userRepository.findByIdWithPassword as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.changePassword('user_id', 'oldPassword', 'newPassword');

      expect(userRepository.findByIdWithPassword).toHaveBeenCalledWith('user_id');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('oldPassword');
      expect(mockUser.passwordHash).toBe('newPassword');
      expect(mockUser.forcePasswordChange).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw error if user not found', async () => {
      (userRepository.findByIdWithPassword as jest.Mock).mockResolvedValue(null);

      await expect(authService.changePassword('user_id', 'oldPass', 'newPass')).rejects.toThrow(AppError);
      await expect(authService.changePassword('user_id', 'oldPass', 'newPass')).rejects.toMatchObject({
        statusCode: 404,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    });

    it('should throw error if current password is wrong', async () => {
      mockUser.comparePassword.mockResolvedValue(false);
      (userRepository.findByIdWithPassword as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.changePassword('user_id', 'wrongOld', 'newPass')).rejects.toThrow(AppError);
      await expect(authService.changePassword('user_id', 'wrongOld', 'newPass')).rejects.toMatchObject({
        statusCode: 400,
        message: ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT,
      });
    });

    it('should throw error if new password is the same as current password', async () => {
      mockUser.comparePassword.mockResolvedValue(true);
      (userRepository.findByIdWithPassword as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.changePassword('user_id', 'samePass', 'samePass')).rejects.toThrow(AppError);
      await expect(authService.changePassword('user_id', 'samePass', 'samePass')).rejects.toMatchObject({
        statusCode: 400,
        message: ERROR_MESSAGES.PASSWORD_REUSE,
      });
    });
  });

  describe('logout', () => {
    it('should blacklist the token and return success message', async () => {
      const result = await authService.logout('some_token');

      expect(authMiddleware.blacklistToken).toHaveBeenCalledWith('some_token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
