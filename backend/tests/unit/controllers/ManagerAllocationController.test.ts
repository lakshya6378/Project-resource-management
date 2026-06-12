import managerAllocationController from '../../../src/controllers/ManagerAllocationController';
import allocationService from '../../../src/services/AllocationService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/AllocationService');
jest.mock('../../../src/utils/responseHelper');

describe('ManagerAllocationController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { id: 'manager_123' },
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createAllocation', () => {
    it('should create allocation and send success response', async () => {
      mockReq.body = { employeeId: 'emp_1', projectId: 'proj_1' };
      const mockAllocation = { id: 'alloc_1' };
      (allocationService.createAllocation as jest.Mock).mockResolvedValue(mockAllocation);

      await managerAllocationController.createAllocation(mockReq, mockRes, mockNext);

      expect(allocationService.createAllocation).toHaveBeenCalledWith(mockReq.body, 'manager_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockAllocation, 'Employee allocated successfully', 201);
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Error');
      (allocationService.createAllocation as jest.Mock).mockRejectedValue(error);

      await managerAllocationController.createAllocation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('endAllocation', () => {
    it('should end allocation and send success response', async () => {
      mockReq.params.id = 'alloc_1';
      const mockResult = { message: 'Ended' };
      (allocationService.endAllocation as jest.Mock).mockResolvedValue(mockResult);

      await managerAllocationController.endAllocation(mockReq, mockRes, mockNext);

      expect(allocationService.endAllocation).toHaveBeenCalledWith('alloc_1', 'manager_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Ended');
    });
  });

  describe('listByProject', () => {
    it('should list by project and send success response', async () => {
      mockReq.params.projectId = 'proj_1';
      const mockAllocations = [{ id: 'alloc_1' }];
      (allocationService.listByProject as jest.Mock).mockResolvedValue(mockAllocations);

      await managerAllocationController.listByProject(mockReq, mockRes, mockNext);

      expect(allocationService.listByProject).toHaveBeenCalledWith('proj_1', 'manager_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockAllocations, 'Project allocations retrieved');
    });
  });

  describe('listByEmployee', () => {
    it('should list by employee and send success response', async () => {
      mockReq.params.employeeId = 'emp_1';
      const mockAllocations = [{ id: 'alloc_1' }];
      (allocationService.listByEmployee as jest.Mock).mockResolvedValue(mockAllocations);

      await managerAllocationController.listByEmployee(mockReq, mockRes, mockNext);

      expect(allocationService.listByEmployee).toHaveBeenCalledWith('emp_1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockAllocations, 'Employee allocations retrieved');
    });
  });
});
