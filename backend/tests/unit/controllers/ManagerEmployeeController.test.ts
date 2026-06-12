import managerEmployeeController from '../../../src/controllers/ManagerEmployeeController';
import resourceService from '../../../src/services/ResourceService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/ResourceService');
jest.mock('../../../src/utils/responseHelper');

describe('ManagerEmployeeController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { id: 'manager_123' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('getTeamEmployees', () => {
    it('should get team employees and send success response', async () => {
      const mockEmployees = [{ id: 'emp_1' }];
      (resourceService.listEmployees as jest.Mock).mockResolvedValue(mockEmployees);

      await managerEmployeeController.getTeamEmployees(mockReq, mockRes, mockNext);

      expect(resourceService.listEmployees).toHaveBeenCalledWith({ managerId: 'manager_123' });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockEmployees, 'Team employees retrieved successfully');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Error');
      (resourceService.listEmployees as jest.Mock).mockRejectedValue(error);

      await managerEmployeeController.getTeamEmployees(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
