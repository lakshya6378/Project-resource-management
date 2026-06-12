import request from 'supertest';
import app from '../../server';
import { generateToken } from '../../src/middleware/auth';
import userService from '../../src/services/UserService';
import resourceService from '../../src/services/ResourceService';

jest.mock('../../src/services/UserService');
jest.mock('../../src/services/ResourceService');

jest.mock('../../src/models', () => ({
  RolePermission: {
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue([]),
  },
  User: {
    findById: jest.fn(),
  },
  Role: {
    find: jest.fn(),
  }
}));

describe('Admin Routes API', () => {
  let token: string;

  beforeEach(() => {
    jest.clearAllMocks();
    token = generateToken({ id: 'admin_id', username: 'admin', role: 'ADMIN' });

    const { User, RolePermission } = require('../../src/models');
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue({
        _id: 'admin_id',
        username: 'admin',
        roleId: { _id: 'role_admin_id', name: 'ADMIN' },
        isActive: true,
        forcePasswordChange: false,
      }),
    };
    (User.findById as jest.Mock).mockReturnValue(mockQuery);
    (RolePermission.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue([])
    });
  });

  afterAll(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  });

  describe('Users Management', () => {
    it('should create a user', async () => {
      const mockDto = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        username: 'janedoe',
        tempPassword: 'Password123!',
        roleId: '507f1f77bcf86cd799439011'
      };
      
      const mockResult = { _id: 'new_user', username: 'janedoe' };
      (userService.createUser as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send(mockDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('janedoe');
    });

    it('should list users', async () => {
      const mockResult = { users: [], counts: {} };
      (userService.listUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Resources Management', () => {
    it('should create a resource', async () => {
      const mockDto = {
        userId: '507f1f77bcf86cd799439011',
        departmentId: '507f1f77bcf86cd799439012',
        designationId: '507f1f77bcf86cd799439013'
      };
      
      const mockResult = { employeeProfile: {}, resourceProfile: {} };
      (resourceService.createEmployee as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/admin/resources')
        .set('Authorization', `Bearer ${token}`)
        .send(mockDto)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should list resources', async () => {
      const mockResult = { employees: [], counts: {} };
      (resourceService.listEmployees as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/admin/resources')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
