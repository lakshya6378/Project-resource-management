import resourceService from '../../../src/services/ResourceService';
import { User, Department, Designation, EmployeeProfile, ResourceProfile, EmployeeSkill } from '../../../src/models';
import { AppError } from '../../../src/middleware/errorHandler';

jest.mock('../../../src/models', () => ({
  User: {
    findById: jest.fn(),
  },
  Department: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
  Designation: {
    findById: jest.fn(),
  },
  EmployeeProfile: {
    findById: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  },
  ResourceProfile: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  },
  EmployeeSkill: {
    find: jest.fn(),
  },
  Allocation: {
    updateMany: jest.fn(),
  },
}));

describe('ResourceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmployee', () => {
    const dto = { userId: 'user_1', departmentId: 'dept_1', designationId: 'desig_1' };

    it('should successfully create employee and resource profiles', async () => {
      const mockUser = {
        _id: 'user_1',
        fullName: 'John Doe',
        roleId: { name: 'EMPLOYEE' }
      };
      (User.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(mockUser) });
      (Department.findById as jest.Mock).mockResolvedValue({ _id: 'dept_1' });
      (Designation.findById as jest.Mock).mockResolvedValue({ _id: 'desig_1' });
      (EmployeeProfile.findById as jest.Mock).mockResolvedValue(null);

      const mockEmpProfile = { _id: 'user_1', fullName: 'John Doe', departmentId: 'dept_1', designationId: 'desig_1' };
      (EmployeeProfile.create as jest.Mock).mockResolvedValue(mockEmpProfile);

      const mockResProfile = { _id: 'user_1', status: 'BENCH', currentUtilisation: 0 };
      (ResourceProfile.create as jest.Mock).mockResolvedValue(mockResProfile);

      const result = await resourceService.createEmployee(dto);

      expect(EmployeeProfile.create).toHaveBeenCalledWith({
        _id: 'user_1',
        fullName: 'John Doe',
        departmentId: 'dept_1',
        designationId: 'desig_1',
      });
      expect(ResourceProfile.create).toHaveBeenCalledWith({
        _id: 'user_1',
        status: 'BENCH',
        currentUtilisation: 0,
      });
      expect(result.employeeProfile).toEqual(mockEmpProfile);
      expect(result.resourceProfile).toEqual(mockResProfile);
    });

    it('should throw error if user not found', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await expect(resourceService.createEmployee(dto))
        .rejects
        .toThrow('User not found');
    });

    it('should throw error if employee profile already exists', async () => {
      (User.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue({ roleId: { name: 'EMPLOYEE' } }) });
      (Department.findById as jest.Mock).mockResolvedValue({ _id: 'dept_1' });
      (Designation.findById as jest.Mock).mockResolvedValue({ _id: 'desig_1' });
      (EmployeeProfile.findById as jest.Mock).mockResolvedValue({ _id: 'user_1' });

      await expect(resourceService.createEmployee(dto))
        .rejects
        .toThrow('Employee profile already exists for this user');
    });
  });

  describe('listEmployees', () => {
    it('should list employees with counts', async () => {
      const mockProfiles = [
        { _id: { _id: 'user_1', email: 'a@a.com', username: 'a', isActive: true }, departmentId: 'd1', designationId: 'd2' }
      ];
      
      const mockResourceProfiles = [
        { _id: 'user_1', status: 'ALLOCATED' }
      ];

      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProfiles),
      };
      (EmployeeProfile.find as jest.Mock).mockReturnValue(queryMock);

      const resQueryMock = {
        lean: jest.fn().mockResolvedValue(mockResourceProfiles),
      };
      (ResourceProfile.find as jest.Mock).mockReturnValue(resQueryMock);

      const result = await resourceService.listEmployees({});

      expect(result.employees.length).toBe(1);
      expect(result.employees[0]._id).toBe('user_1');
      expect(result.counts).toEqual({ total: 1, allocated: 1, bench: 0 });
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee details with resource and skills', async () => {
      const mockProfile = { _id: { _id: 'user_1', email: 'a@a.com', username: 'a', isActive: true } };
      
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProfile),
      };
      (EmployeeProfile.findById as jest.Mock).mockReturnValue(queryMock);

      const resQueryMock = {
        lean: jest.fn().mockResolvedValue({ _id: 'user_1', status: 'BENCH' }),
      };
      (ResourceProfile.findById as jest.Mock).mockReturnValue(resQueryMock);

      const skillQueryMock = {
        populate: jest.fn().mockResolvedValue([]),
      };
      (EmployeeSkill.find as jest.Mock).mockReturnValue(skillQueryMock);

      const result = await resourceService.getEmployeeById('user_1');

      expect(result._id).toBe('user_1');
      expect(result.resourceData.status).toBe('BENCH');
      expect(result.skills).toEqual([]);
    });

    it('should throw error if profile not found', async () => {
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      (EmployeeProfile.findById as jest.Mock).mockReturnValue(queryMock);

      await expect(resourceService.getEmployeeById('user_1'))
        .rejects
        .toThrow('Employee profile not found');
    });
  });

  describe('updateEmployee', () => {
    it('should update employee profile', async () => {
      const mockProfile = {
        _id: 'user_1',
        departmentId: 'old',
        designationId: 'old',
        save: jest.fn().mockResolvedValue(true),
      };
      (EmployeeProfile.findById as jest.Mock).mockResolvedValue(mockProfile);

      const result = await resourceService.updateEmployee('user_1', { departmentId: 'newDept', designationId: 'newDesig' });

      expect(mockProfile.departmentId).toBe('newDept');
      expect(mockProfile.designationId).toBe('newDesig');
      expect(mockProfile.save).toHaveBeenCalled();
    });
  });

  describe('deactivateEmployee', () => {
    it('should deactivate user and set resource profile to INACTIVE', async () => {
      const mockUser = { _id: 'user_1', isActive: true, save: jest.fn() };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const mockResourceProfile = { _id: 'user_1', status: 'BENCH', currentUtilisation: 100, save: jest.fn() };
      (ResourceProfile.findById as jest.Mock).mockResolvedValue(mockResourceProfile);
      
      const { Allocation } = require('../../../src/models');
      (Allocation.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      await resourceService.deactivateEmployee('user_1');

      expect(mockUser.isActive).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResourceProfile.status).toBe('INACTIVE');
      expect(mockResourceProfile.currentUtilisation).toBe(0);
      expect(mockResourceProfile.save).toHaveBeenCalled();
    });
  });
});
