import allocationService from '../../../src/services/AllocationService';
import { Project, Allocation, ResourceProfile, EmployeeProfile } from '../../../src/models';
import { AppError } from '../../../src/middleware/errorHandler';

jest.mock('../../../src/models', () => ({
  Allocation: {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
  Project: {
    findById: jest.fn(),
  },
  ResourceProfile: {
    findOneAndUpdate: jest.fn(),
  },
  EmployeeProfile: {
    find: jest.fn(),
  },
}));

describe('AllocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAllocation', () => {
    const dto = {
      employeeId: 'emp_1',
      projectId: 'proj_1',
      utilisation: 50,
      fromDate: '2026-01-01',
      toDate: '2026-12-31'
    };
    const managerId = 'mgr_1';

    it('should throw error if project not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(null);
      await expect(allocationService.createAllocation(dto, managerId))
        .rejects.toThrow('Project not found');
    });

    it('should throw error if manager is not authorized', async () => {
      (Project.findById as jest.Mock).mockResolvedValue({ managerId: 'mgr_other', status: 'ACTIVE' });
      await expect(allocationService.createAllocation(dto, managerId))
        .rejects.toThrow('You are not authorized to allocate to this project');
    });

    it('should throw error if project is closed', async () => {
      (Project.findById as jest.Mock).mockResolvedValue({ managerId: 'mgr_1', status: 'CLOSED' });
      await expect(allocationService.createAllocation(dto, managerId))
        .rejects.toThrow('Can only allocate to active or planned projects');
    });

    it('should throw error if over-allocated', async () => {
      (Project.findById as jest.Mock).mockResolvedValue({ managerId: 'mgr_1', status: 'ACTIVE' });
      // Mock existing allocations sum to 60
      (Allocation.find as jest.Mock).mockResolvedValue([{ utilisation: 60 }]);

      await expect(allocationService.createAllocation(dto, managerId))
        .rejects.toThrow(/Over-allocation/);
    });

    it('should successfully create allocation and update resource utilisation', async () => {
      (Project.findById as jest.Mock).mockResolvedValue({ managerId: 'mgr_1', status: 'ACTIVE' });
      (Allocation.find as jest.Mock)
        .mockResolvedValueOnce([{ utilisation: 30 }]) // First find for overlap check
        .mockResolvedValueOnce([{ utilisation: 80 }]); // Second find for _updateResourceCurrentUtilisation
      
      const mockCreated = { ...dto, _id: 'alloc_1', managerId, isActive: true };
      (Allocation.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await allocationService.createAllocation(dto, managerId);

      expect(result).toEqual(mockCreated);
      expect(Allocation.create).toHaveBeenCalled();
      expect(ResourceProfile.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'emp_1' },
        { currentUtilisation: 80, status: 'ALLOCATED' },
        { new: true }
      );
    });
  });

  describe('endAllocation', () => {
    it('should end allocation successfully', async () => {
      const mockAlloc = { managerId: 'mgr_1', resourceId: 'emp_1', isActive: true, save: jest.fn() };
      (Allocation.findById as jest.Mock).mockResolvedValue(mockAlloc);
      (Allocation.find as jest.Mock).mockResolvedValue([]); // For update util

      const result = await allocationService.endAllocation('alloc_1', 'mgr_1');

      expect(result.message).toBe('Allocation ended successfully');
      expect(mockAlloc.isActive).toBe(false);
      expect(mockAlloc.save).toHaveBeenCalled();
    });

    it('should throw error if not authorized', async () => {
      const mockAlloc = { managerId: 'mgr_other', resourceId: 'emp_1' };
      (Allocation.findById as jest.Mock).mockResolvedValue(mockAlloc);

      await expect(allocationService.endAllocation('alloc_1', 'mgr_1'))
        .rejects.toThrow('Not authorized');
    });
  });

  describe('listByProject', () => {
    it('should return mapped allocations', async () => {
      const mockAllocs = [
        { _id: 'alloc_1', resourceId: { _id: 'emp_1', fullName: 'Emp 1' } }
      ];
      (Allocation.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAllocs)
      });

      const mockProfiles = [
        { _id: 'emp_1', departmentId: { name: 'Engineering' } }
      ];
      (EmployeeProfile.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProfiles)
      });

      const result = await allocationService.listByProject('proj_1', 'mgr_1');

      expect(result.length).toBe(1);
      expect(result[0].employeeId.department).toBe('Engineering');
    });
  });

  describe('listByEmployee', () => {
    it('should return employee allocations', async () => {
      const mockResult = [{ _id: 'alloc_1' }];
      (Allocation.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockResult)
      });

      const result = await allocationService.listByEmployee('emp_1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('listAllAllocations', () => {
    it('should return all allocations', async () => {
      const mockResult = [{ _id: 'alloc_1' }];
      (Allocation.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockResult)
      });

      const result = await allocationService.listAllAllocations();
      expect(result).toEqual(mockResult);
    });
  });
});
