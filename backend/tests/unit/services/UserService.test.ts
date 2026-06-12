import userService from '../../../src/services/UserService';
import { userRepository } from '../../../src/repositories';
import { AppError } from '../../../src/middleware/errorHandler';

jest.mock('../../../src/repositories', () => ({
  userRepository: {
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    countByStatus: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByIdWithPassword: jest.fn(),
  },
}));

jest.mock('../../../src/models', () => ({
  Role: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../src/services/EmailService', () => ({
  __esModule: true,
  default: {
    sendAccountCredentialsEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const mockDto = {
      fullName: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      tempPassword: 'password123',
      roleId: 'role_id',
    };
    const adminId = 'admin_id';

    it('should successfully create a new user and send email', async () => {
      (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      
      const { Role } = require('../../../src/models');
      (Role.findById as jest.Mock).mockResolvedValue({ _id: 'role_id' });

      const mockCreatedUser = { ...mockDto, _id: 'new_user_id' };
      (userRepository.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      const emailService = require('../../../src/services/EmailService').default;
      
      const result = await userService.createUser(mockDto, adminId);

      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'john@example.com',
        username: 'johndoe',
        passwordHash: 'password123',
        isActive: true,
        forcePasswordChange: true,
      }));
      expect(emailService.sendAccountCredentialsEmail).toHaveBeenCalledWith(mockCreatedUser, 'password123');
      expect(result).toEqual(mockCreatedUser);
    });

    it('should throw error if username already exists', async () => {
      (userRepository.findByUsername as jest.Mock).mockResolvedValue({ _id: 'existing' });

      await expect(userService.createUser(mockDto, adminId))
        .rejects
        .toThrow(AppError);
      await expect(userService.createUser(mockDto, adminId))
        .rejects
        .toThrow('Username already exists');
    });

    it('should throw error if email already exists', async () => {
      (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({ _id: 'existing' });

      await expect(userService.createUser(mockDto, adminId))
        .rejects
        .toThrow('Email already exists');
    });

    it('should throw error if role does not exist', async () => {
      (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      const { Role } = require('../../../src/models');
      (Role.findById as jest.Mock).mockResolvedValue(null);

      await expect(userService.createUser(mockDto, adminId))
        .rejects
        .toThrow('Invalid role ID');
    });
  });

  describe('listUsers', () => {
    it('should return a list of users and counts', async () => {
      const mockUsers = [{ _id: 'user_1' }, { _id: 'user_2' }];
      const mockCounts = { total: 2, active: 1, inactive: 1 };

      (userRepository.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (userRepository.countByStatus as jest.Mock).mockResolvedValue(mockCounts);

      const result = await userService.listUsers();

      expect(result).toEqual({ users: mockUsers, counts: mockCounts });
      expect(userRepository.findAll).toHaveBeenCalled();
      expect(userRepository.countByStatus).toHaveBeenCalled();
    });
  });

  describe('deactivateUser', () => {
    it('should successfully deactivate a user', async () => {
      const mockUser = { _id: 'user_1', isActive: true };
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.update as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

      const result = await userService.deactivateUser('user_1', 'admin_id');

      expect(result.isActive).toBe(false);
      expect(userRepository.update).toHaveBeenCalledWith('user_1', { isActive: false });
    });

    it('should throw error if deactivating own account', async () => {
      await expect(userService.deactivateUser('admin_id', 'admin_id'))
        .rejects
        .toThrow('You cannot deactivate your own account');
    });

    it('should throw error if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(userService.deactivateUser('user_1', 'admin_id'))
        .rejects
        .toThrow('User not found');
    });

    it('should throw error if user is already deactivated', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({ _id: 'user_1', isActive: false });

      await expect(userService.deactivateUser('user_1', 'admin_id'))
        .rejects
        .toThrow('User is already deactivated');
    });
  });

  describe('reactivateUser', () => {
    it('should successfully reactivate a user', async () => {
      const mockUser = { _id: 'user_1', isActive: false };
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.update as jest.Mock).mockResolvedValue({ ...mockUser, isActive: true });

      const result = await userService.reactivateUser('user_1');

      expect(result.isActive).toBe(true);
      expect(userRepository.update).toHaveBeenCalledWith('user_1', { isActive: true });
    });

    it('should throw error if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(userService.reactivateUser('user_1'))
        .rejects
        .toThrow('User not found');
    });

    it('should throw error if user is already active', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({ _id: 'user_1', isActive: true });

      await expect(userService.reactivateUser('user_1'))
        .rejects
        .toThrow('User is already active');
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset user password', async () => {
      const mockUserWithPass = {
        _id: 'user_1',
        passwordHash: 'oldHash',
        forcePasswordChange: false,
        save: jest.fn().mockResolvedValue(true),
      };
      (userRepository.findByIdWithPassword as jest.Mock).mockResolvedValue(mockUserWithPass);

      const result = await userService.resetPassword('user_1', 'newPass123');

      expect(mockUserWithPass.passwordHash).toBe('newPass123');
      expect(mockUserWithPass.forcePasswordChange).toBe(true);
      expect(mockUserWithPass.save).toHaveBeenCalled();
      expect(result.message).toBe('Password reset successfully. User must change password on next login.');
    });

    it('should throw error if user not found', async () => {
      (userRepository.findByIdWithPassword as jest.Mock).mockResolvedValue(null);

      await expect(userService.resetPassword('user_1', 'newPass123'))
        .rejects
        .toThrow('User not found');
    });
  });
});
