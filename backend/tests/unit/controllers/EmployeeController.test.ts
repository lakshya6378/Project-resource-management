import employeeController from '../../../src/controllers/EmployeeController';
import timesheetService from '../../../src/services/TimesheetService';
import allocationService from '../../../src/services/AllocationService';
import resourceService from '../../../src/services/ResourceService';
import { sendSuccess } from '../../../src/utils/responseHelper';
import { AppError } from '../../../src/middleware/errorHandler';

jest.mock('../../../src/services/TimesheetService');
jest.mock('../../../src/services/AllocationService');
jest.mock('../../../src/services/ResourceService');
jest.mock('../../../src/utils/responseHelper');

describe('EmployeeController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { id: 'user_123' },
      body: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('_getMyEmployee', () => {
    it('should throw AppError if employee profile is not found', async () => {
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(null);

      await expect(employeeController._getMyEmployee('user_123')).rejects.toThrow(AppError);
      await expect(employeeController._getMyEmployee('user_123')).rejects.toThrow('No employee profile linked to your account');
    });

    it('should return employee if found', async () => {
      const mockEmployee = { _id: 'emp_123' };
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await employeeController._getMyEmployee('user_123');
      expect(result).toEqual(mockEmployee);
      expect(resourceService.getEmployeeById).toHaveBeenCalledWith('user_123');
    });
  });

  describe('getMyAllocations', () => {
    it('should get allocations and send success response', async () => {
      const mockEmployee = { _id: 'emp_123' };
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(mockEmployee);
      
      const mockAllocations = [{ id: 'alloc_1' }];
      (allocationService.listByEmployee as jest.Mock).mockResolvedValue(mockAllocations);

      await employeeController.getMyAllocations(mockReq, mockRes, mockNext);

      expect(resourceService.getEmployeeById).toHaveBeenCalledWith('user_123');
      expect(allocationService.listByEmployee).toHaveBeenCalledWith('emp_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockAllocations, 'Your allocations retrieved');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Database error');
      (resourceService.getEmployeeById as jest.Mock).mockRejectedValue(error);

      await employeeController.getMyAllocations(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('submitTimesheet', () => {
    it('should submit timesheet and send success response', async () => {
      const mockEmployee = { _id: 'emp_123' };
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(mockEmployee);
      
      mockReq.body = { hours: 40 };
      const mockTimesheet = { id: 'ts_1' };
      (timesheetService.submitTimesheet as jest.Mock).mockResolvedValue(mockTimesheet);

      await employeeController.submitTimesheet(mockReq, mockRes, mockNext);

      expect(timesheetService.submitTimesheet).toHaveBeenCalledWith(mockReq.body, 'emp_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockTimesheet, 'Timesheet submitted successfully', 201);
    });
  });

  describe('getMyTimesheets', () => {
    it('should get timesheets and send success response', async () => {
      const mockEmployee = { _id: 'emp_123' };
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(mockEmployee);
      
      const mockTimesheets = [{ id: 'ts_1' }];
      (timesheetService.getEmployeeTimesheets as jest.Mock).mockResolvedValue(mockTimesheets);

      await employeeController.getMyTimesheets(mockReq, mockRes, mockNext);

      expect(timesheetService.getEmployeeTimesheets).toHaveBeenCalledWith('emp_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockTimesheets, 'Your timesheets retrieved');
    });
  });

  describe('getTimesheetByWeek', () => {
    it('should get timesheet by week and send success response', async () => {
      const mockEmployee = { _id: 'emp_123' };
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(mockEmployee);
      
      mockReq.params.weekStart = '2023-10-01';
      const mockTimesheet = { id: 'ts_1' };
      (timesheetService.getTimesheetByWeek as jest.Mock).mockResolvedValue(mockTimesheet);

      await employeeController.getTimesheetByWeek(mockReq, mockRes, mockNext);

      expect(timesheetService.getTimesheetByWeek).toHaveBeenCalledWith('emp_123', '2023-10-01');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockTimesheet, 'Timesheet retrieved');
    });
  });

  describe('requestTimesheetAccess', () => {
    it('should request access and send success response', async () => {
      const mockEmployee = { _id: 'emp_123' };
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(mockEmployee);
      
      mockReq.body = { weekStart: '2023-10-01', reason: 'Forgot' };
      const mockResponse = { message: 'Access granted' };
      (timesheetService.requestMissedTimesheetAccess as jest.Mock).mockResolvedValue(mockResponse);

      await employeeController.requestTimesheetAccess(mockReq, mockRes, mockNext);

      expect(timesheetService.requestMissedTimesheetAccess).toHaveBeenCalledWith('emp_123', '2023-10-01', 'Forgot');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResponse, 'Timesheet access requested successfully');
    });
  });
});
