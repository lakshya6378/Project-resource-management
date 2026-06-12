import authController from '../../../src/controllers/AuthController';
import authService from '../../../src/services/AuthService';
import * as responseHelper from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/AuthService', () => ({
  login: jest.fn(),
  changePassword: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('../../../src/utils/responseHelper', () => ({
  sendSuccess: jest.fn(),
}));

describe('AuthController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      user: {},
      token: '',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('login', () => {
    it('should call authService.login and send success response', async () => {
      mockReq.body = { username: 'testuser', password: 'password123' };
      const mockResult = { token: 'mockToken', user: { id: '1' } };
      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      await authController.login(mockReq, mockRes, mockNext);

      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(responseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Login successful');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if authService.login throws', async () => {
      mockReq.body = { username: 'testuser', password: 'password123' };
      const error = new Error('Invalid credentials');
      (authService.login as jest.Mock).mockRejectedValue(error);

      await authController.login(mockReq, mockRes, mockNext);

      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(responseHelper.sendSuccess).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword and send success response', async () => {
      mockReq.body = { currentPassword: 'oldPass', newPassword: 'newPass' };
      mockReq.user = { id: 'userId123' };
      (authService.changePassword as jest.Mock).mockResolvedValue({ message: 'Success' });

      await authController.changePassword(mockReq, mockRes, mockNext);

      expect(authService.changePassword).toHaveBeenCalledWith('userId123', 'oldPass', 'newPass');
      expect(responseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Success');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if authService.changePassword throws', async () => {
      mockReq.body = { currentPassword: 'oldPass', newPassword: 'newPass' };
      mockReq.user = { id: 'userId123' };
      const error = new Error('Auth Error');
      (authService.changePassword as jest.Mock).mockRejectedValue(error);

      await authController.changePassword(mockReq, mockRes, mockNext);

      expect(authService.changePassword).toHaveBeenCalledWith('userId123', 'oldPass', 'newPass');
      expect(responseHelper.sendSuccess).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and send success response', async () => {
      mockReq.token = 'mockJwtToken';
      (authService.logout as jest.Mock).mockResolvedValue({ message: 'Logged out successfully' });

      await authController.logout(mockReq, mockRes, mockNext);

      expect(authService.logout).toHaveBeenCalledWith('mockJwtToken');
      expect(responseHelper.sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Logged out successfully');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if authService.logout throws', async () => {
      mockReq.token = 'mockJwtToken';
      const error = new Error('Logout failed');
      (authService.logout as jest.Mock).mockRejectedValue(error);

      await authController.logout(mockReq, mockRes, mockNext);

      expect(authService.logout).toHaveBeenCalledWith('mockJwtToken');
      expect(responseHelper.sendSuccess).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
