import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  generateToken,
  verifyToken,
  requireRole,
  checkForcePasswordChange,
  blacklistToken,
  isTokenBlacklisted,
} from '../../../src/middleware/auth';
import env from '../../../src/config/env';
import { User, RolePermission } from '../../../src/models';
import BlacklistedToken from '../../../src/models/BlacklistedToken';

jest.mock('jsonwebtoken');
jest.mock('../../../src/models/BlacklistedToken', () => ({
  __esModule: true,
  default: {
    exists: jest.fn(),
    create: jest.fn(),
  }
}));
jest.mock('../../../src/models', () => ({
  User: {
    findById: jest.fn(),
  },
  RolePermission: {
    find: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
      originalUrl: '/api/some/route',
      user: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('Tokens and Blacklist', () => {
    it('should generate a token with the correct payload and secret', () => {
      const payload = { id: '1', username: 'test', role: 'ADMIN' };
      (jwt.sign as jest.Mock).mockReturnValue('mock_jwt_token');

      const token = generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY });
      expect(token).toBe('mock_jwt_token');
    });

    it('should add to blacklist and check if blacklisted', async () => {
      (BlacklistedToken.exists as jest.Mock).mockResolvedValue(null);
      expect(await isTokenBlacklisted('some_token')).toBe(false);

      (BlacklistedToken.create as jest.Mock).mockResolvedValue({});
      await blacklistToken('some_token');
      
      (BlacklistedToken.exists as jest.Mock).mockResolvedValue({ _id: '123' });
      expect(await isTokenBlacklisted('some_token')).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('should return 401 if no token provided', async () => {
      await verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Access denied. No token provided.' }));
    });

    it('should return 401 if token is blacklisted', async () => {
      (BlacklistedToken.exists as jest.Mock).mockResolvedValue({ _id: '123' });
      mockReq.headers.authorization = 'Bearer blacklisted_token';

      await verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token has been invalidated. Please log in again.' }));
    });

    it('should successfully verify a token and populate req.user', async () => {
      (BlacklistedToken.exists as jest.Mock).mockResolvedValue(null);
      mockReq.headers.authorization = 'Bearer valid_token';
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'user_id' });
      
      const mockUser = {
        _id: 'user_id',
        username: 'testuser',
        roleId: { _id: 'role_id', name: 'ADMIN' },
        isActive: true,
        forcePasswordChange: false,
      };
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockUser),
      };
      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      const mockRolePermissions = [
        { permissionId: { code: 'manage_users' } },
      ];
      
      const mockRpQuery = {
        populate: jest.fn().mockResolvedValue(mockRolePermissions),
      };
      (RolePermission.find as jest.Mock).mockReturnValue(mockRpQuery);

      await verifyToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        id: 'user_id',
        username: 'testuser',
        role: 'ADMIN',
        permissions: ['manage_users'],
        isActive: true,
        forcePasswordChange: false,
      });
      expect(mockReq.token).toBe('valid_token');
    });

    it('should return 401 if user account not found after decoding', async () => {
      (BlacklistedToken.exists as jest.Mock).mockResolvedValue(null);
      mockReq.headers.authorization = 'Bearer valid_token';
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'user_id' });
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(null),
      };
      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      await verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User account not found.' }));
    });
  });

  describe('requireRole', () => {
    it('should return 401 if req.user is undefined', () => {
      const middleware = requireRole('ADMIN');
      mockReq.user = undefined;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if user role is not allowed', () => {
      const middleware = requireRole('ADMIN');
      mockReq.user = { role: 'EMPLOYEE' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should call next if user role is allowed', () => {
      const middleware = requireRole('ADMIN', 'MANAGER');
      mockReq.user = { role: 'MANAGER' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('checkForcePasswordChange', () => {
    it('should skip check for /api/auth/change-password route', () => {
      mockReq.path = '/api/auth/change-password';
      mockReq.user = { forcePasswordChange: true };

      checkForcePasswordChange(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if forcePasswordChange is true', () => {
      mockReq.path = '/api/users';
      mockReq.user = { forcePasswordChange: true };

      checkForcePasswordChange(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Password change required. Please change your password before accessing the system.' }));
    });

    it('should call next if forcePasswordChange is false', () => {
      mockReq.path = '/api/users';
      mockReq.user = { forcePasswordChange: false };

      checkForcePasswordChange(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
