import adminUserController from '../../../src/controllers/AdminUserController';
import userService from '../../../src/services/UserService';
import { sendSuccess } from '../../../src/utils/responseHelper';
import { Role } from '../../../src/models';

jest.mock('../../../src/services/UserService');
jest.mock('../../../src/utils/responseHelper');
jest.mock('../../../src/models', () => ({
  Role: {
    find: jest.fn(),
  },
}));

describe('AdminUserController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      user: { id: 'admin_id' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createUser', () => {
    it('should call userService.createUser and send success response', async () => {
      mockReq.body = { username: 'testuser' };
      const mockUser = { id: 'new_user_id', username: 'testuser' };
      (userService.createUser as jest.Mock).mockResolvedValue(mockUser);

      await adminUserController.createUser(mockReq, mockRes, mockNext);

      expect(userService.createUser).toHaveBeenCalledWith(mockReq.body, 'admin_id');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockUser, 'User created successfully', 201);
    });

    it('should call next with error if userService.createUser throws', async () => {
      const error = new Error('Creation failed');
      (userService.createUser as jest.Mock).mockRejectedValue(error);

      await adminUserController.createUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listRoles', () => {
    it('should fetch roles and send success response', async () => {
      const mockRoles = [{ name: 'ADMIN' }, { name: 'EMPLOYEE' }];
      (Role.find as jest.Mock).mockResolvedValue(mockRoles);

      await adminUserController.listRoles(mockReq, mockRes, mockNext);

      expect(Role.find).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockRoles, 'Roles fetched successfully');
    });

    it('should call next with error if Role.find throws', async () => {
      const error = new Error('Database error');
      (Role.find as jest.Mock).mockRejectedValue(error);

      await adminUserController.listRoles(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listUsers', () => {
    it('should fetch users and send success response', async () => {
      const mockResult = { users: [], counts: {} };
      (userService.listUsers as jest.Mock).mockResolvedValue(mockResult);

      await adminUserController.listUsers(mockReq, mockRes, mockNext);

      expect(userService.listUsers).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Users fetched successfully');
    });

    it('should call next with error if userService.listUsers throws', async () => {
      const error = new Error('Database error');
      (userService.listUsers as jest.Mock).mockRejectedValue(error);

      await adminUserController.listUsers(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user and send success response', async () => {
      mockReq.params.id = 'user_1';
      const mockUser = { id: 'user_1', isActive: false };
      (userService.deactivateUser as jest.Mock).mockResolvedValue(mockUser);

      await adminUserController.deactivateUser(mockReq, mockRes, mockNext);

      expect(userService.deactivateUser).toHaveBeenCalledWith('user_1', 'admin_id');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockUser, 'User deactivated successfully');
    });

    it('should call next with error if userService.deactivateUser throws', async () => {
      mockReq.params.id = 'user_1';
      const error = new Error('Not found');
      (userService.deactivateUser as jest.Mock).mockRejectedValue(error);

      await adminUserController.deactivateUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user and send success response', async () => {
      mockReq.params.id = 'user_1';
      const mockUser = { id: 'user_1', isActive: true };
      (userService.reactivateUser as jest.Mock).mockResolvedValue(mockUser);

      await adminUserController.reactivateUser(mockReq, mockRes, mockNext);

      expect(userService.reactivateUser).toHaveBeenCalledWith('user_1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockUser, 'User reactivated successfully');
    });

    it('should call next with error if userService.reactivateUser throws', async () => {
      mockReq.params.id = 'user_1';
      const error = new Error('Not found');
      (userService.reactivateUser as jest.Mock).mockRejectedValue(error);

      await adminUserController.reactivateUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resetPassword', () => {
    it('should reset password and send success response', async () => {
      mockReq.params.id = 'user_1';
      mockReq.body.tempPassword = 'newPassword';
      const mockResult = { message: 'Password reset' };
      (userService.resetPassword as jest.Mock).mockResolvedValue(mockResult);

      await adminUserController.resetPassword(mockReq, mockRes, mockNext);

      expect(userService.resetPassword).toHaveBeenCalledWith('user_1', 'newPassword');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Password reset');
    });

    it('should call next with error if userService.resetPassword throws', async () => {
      mockReq.params.id = 'user_1';
      mockReq.body.tempPassword = 'newPassword';
      const error = new Error('Not found');
      (userService.resetPassword as jest.Mock).mockRejectedValue(error);

      await adminUserController.resetPassword(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
