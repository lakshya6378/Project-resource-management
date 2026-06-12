import managerTimesheetController from '../../../src/controllers/ManagerTimesheetController';
import timesheetService from '../../../src/services/TimesheetService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/TimesheetService');
jest.mock('../../../src/utils/responseHelper');

describe('ManagerTimesheetController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { id: 'mgr_1' },
      query: {},
      params: {},
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('getTeamTimesheets', () => {
    it('should call service and send success response', async () => {
      mockReq.query = { weekStart: '2026-06-01' };
      const mockResult = [{ id: '1' }];
      (timesheetService.getTeamTimesheets as jest.Mock).mockResolvedValue(mockResult);

      await managerTimesheetController.getTeamTimesheets(mockReq, mockRes, mockNext);

      expect(timesheetService.getTeamTimesheets).toHaveBeenCalledWith('mgr_1', '2026-06-01');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Team timesheets retrieved');
    });

    it('should return 400 if weekStart is missing', async () => {
      mockReq.query = {}; // Missing weekStart

      await managerTimesheetController.getTeamTimesheets(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'weekStart query parameter is required',
      }));
    });

    it('should call next with error if service throws', async () => {
      mockReq.query = { weekStart: '2026-06-01' };
      const error = new Error('Service error');
      (timesheetService.getTeamTimesheets as jest.Mock).mockRejectedValue(error);

      await managerTimesheetController.getTeamTimesheets(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getPendingRequests', () => {
    it('should call service and send success response', async () => {
      const mockResult = [{ id: '1' }];
      (timesheetService.getPendingAccessRequests as jest.Mock).mockResolvedValue(mockResult);

      await managerTimesheetController.getPendingRequests(mockReq, mockRes, mockNext);

      expect(timesheetService.getPendingAccessRequests).toHaveBeenCalledWith('mgr_1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Pending access requests retrieved');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Service error');
      (timesheetService.getPendingAccessRequests as jest.Mock).mockRejectedValue(error);

      await managerTimesheetController.getPendingRequests(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('reviewTimesheetAccess', () => {
    it('should call service and send success response for approval', async () => {
      mockReq.params.id = 'ts_1';
      mockReq.body = { approved: true };
      const mockResult = { id: 'ts_1' };
      (timesheetService.reviewTimesheetAccessRequest as jest.Mock).mockResolvedValue(mockResult);

      await managerTimesheetController.reviewTimesheetAccess(mockReq, mockRes, mockNext);

      expect(timesheetService.reviewTimesheetAccessRequest).toHaveBeenCalledWith('mgr_1', 'ts_1', true);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Timesheet access approved successfully');
    });

    it('should call service and send success response for rejection', async () => {
      mockReq.params.id = 'ts_1';
      mockReq.body = { approved: false };
      const mockResult = { id: 'ts_1' };
      (timesheetService.reviewTimesheetAccessRequest as jest.Mock).mockResolvedValue(mockResult);

      await managerTimesheetController.reviewTimesheetAccess(mockReq, mockRes, mockNext);

      expect(timesheetService.reviewTimesheetAccessRequest).toHaveBeenCalledWith('mgr_1', 'ts_1', false);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Timesheet access rejected successfully');
    });

    it('should call next with error if service throws', async () => {
      mockReq.params.id = 'ts_1';
      mockReq.body = { approved: true };
      const error = new Error('Service error');
      (timesheetService.reviewTimesheetAccessRequest as jest.Mock).mockRejectedValue(error);

      await managerTimesheetController.reviewTimesheetAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
