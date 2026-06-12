import request from 'supertest';
import app from '../../server';
import { userRepository } from '../../src/repositories';
import { generateToken } from '../../src/middleware/auth';

jest.mock('../../src/repositories', () => ({
  userRepository: {
    findByUsername: jest.fn(),
    findByIdWithPassword: jest.fn(),
  },
}));

jest.mock('../../src/models', () => ({
  RolePermission: {
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue([]),
  },
  User: {
    findById: jest.fn(),
  },
}));

jest.mock('../../src/middleware/auth', () => {
  const actualAuth = jest.requireActual('../../src/middleware/auth');
  return {
    ...actualAuth,
  };
});

describe('Auth Routes API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully and return token', async () => {
      const mockUser = {
        _id: 'user_id',
        username: 'johndoe',
        fullName: 'John Doe',
        isActive: true,
        roleId: { _id: 'role_id', name: 'EMPLOYEE' },
        forcePasswordChange: false,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      (userRepository.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'johndoe', password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.username).toBe('johndoe');
    });

    it('should fail if credentials missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'johndoe' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid credentials', async () => {
      (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrong', password: '123' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username or password');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should fail without authorization token', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'old', newPassword: 'new' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    it('should change password successfully', async () => {
      const token = generateToken({ id: 'user_id', username: 'johndoe', role: 'EMPLOYEE' });

      const { User, RolePermission } = require('../../src/models');
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue({
          _id: 'user_id',
          username: 'johndoe',
          roleId: { _id: 'role_id', name: 'EMPLOYEE' },
          isActive: true,
          forcePasswordChange: false,
        }),
      };
      (User.findById as jest.Mock).mockReturnValue(mockQuery);
      (RolePermission.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const mockUserWithPass = {
        _id: 'user_id',
        passwordHash: 'oldHash',
        forcePasswordChange: false,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn(),
      };
      (userRepository.findByIdWithPassword as jest.Mock).mockResolvedValue(mockUserWithPass);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'newPassword123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout and blacklist token', async () => {
      const token = generateToken({ id: 'user_id', username: 'johndoe', role: 'EMPLOYEE' });

      const { User, RolePermission } = require('../../src/models');
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue({
          _id: 'user_id',
          username: 'johndoe',
          roleId: { _id: 'role_id', name: 'EMPLOYEE' },
          isActive: true,
          forcePasswordChange: false,
        }),
      };
      (User.findById as jest.Mock).mockReturnValue(mockQuery);
      (RolePermission.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const response2 = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response2.body.message).toBe('Token has been invalidated. Please log in again.');
    });
  });
});
