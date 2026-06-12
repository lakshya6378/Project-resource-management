import adminConfigController from '../../../src/controllers/AdminConfigController';
import systemConfigService from '../../../src/services/SystemConfigService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/SystemConfigService');
jest.mock('../../../src/utils/responseHelper');

describe('AdminConfigController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { id: 'admin_1' },
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('getConfig', () => {
    it('should call service and send success response', async () => {
      const mockConfig = { maxWeeklyHours: 40 };
      (systemConfigService.getConfig as jest.Mock).mockResolvedValue(mockConfig);

      await adminConfigController.getConfig(mockReq, mockRes, mockNext);

      expect(systemConfigService.getConfig).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockConfig, 'System configuration retrieved');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('DB Error');
      (systemConfigService.getConfig as jest.Mock).mockRejectedValue(error);

      await adminConfigController.getConfig(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateConfig', () => {
    it('should call service and send success response', async () => {
      mockReq.body = { maxWeeklyHours: 45 };
      const mockConfig = { maxWeeklyHours: 45 };
      (systemConfigService.updateConfig as jest.Mock).mockResolvedValue(mockConfig);

      await adminConfigController.updateConfig(mockReq, mockRes, mockNext);

      expect(systemConfigService.updateConfig).toHaveBeenCalledWith({ maxWeeklyHours: 45 }, 'admin_1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockConfig, 'System configuration updated');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Validation Error');
      (systemConfigService.updateConfig as jest.Mock).mockRejectedValue(error);

      await adminConfigController.updateConfig(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
