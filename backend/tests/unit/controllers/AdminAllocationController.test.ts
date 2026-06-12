import adminAllocationController from '../../../src/controllers/AdminAllocationController';
import allocationService from '../../../src/services/AllocationService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/AllocationService');
jest.mock('../../../src/utils/responseHelper');

describe('AdminAllocationController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('listAllAllocations', () => {
    it('should call service and send success response', async () => {
      const mockAllocations = [{ id: '1' }];
      (allocationService.listAllAllocations as jest.Mock).mockResolvedValue(mockAllocations);

      await adminAllocationController.listAllAllocations(mockReq, mockRes, mockNext);

      expect(allocationService.listAllAllocations).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockAllocations, 'All allocations retrieved successfully');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Database error');
      (allocationService.listAllAllocations as jest.Mock).mockRejectedValue(error);

      await adminAllocationController.listAllAllocations(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
