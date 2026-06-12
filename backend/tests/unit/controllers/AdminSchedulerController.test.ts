import adminSchedulerController from '../../../src/controllers/AdminSchedulerController';
import schedulerService from '../../../src/services/SchedulerService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/SchedulerService');
jest.mock('../../../src/utils/responseHelper');

describe('AdminSchedulerController', () => {
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

  describe('triggerJobs', () => {
    it('should trigger jobs in background and send success response', async () => {
      (schedulerService.runAllJobs as jest.Mock).mockResolvedValue(undefined);

      await adminSchedulerController.triggerJobs(mockReq, mockRes, mockNext);

      expect(schedulerService.runAllJobs).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Scheduler jobs triggered successfully in the background');
    });
  });
});
