jest.mock('../../../src/config/env', () => ({
  default: {
    MONGODB_URI: 'test',
    JWT_SECRET: 'test'
  }
}));

import managerProjectController from '../../../src/controllers/ManagerProjectController';
import aiService from '../../../src/services/AiService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/AiService');
jest.mock('../../../src/services/ProjectService', () => {
  return {
    default: {
      listProjects: jest.fn()
    }
  };
});
jest.mock('../../../src/utils/responseHelper');

describe('ManagerProjectController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let projectService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { id: 'manager_123' },
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    projectService = require('../../../src/services/ProjectService').default;
  });

  describe('suggestTeam', () => {
    it('should suggest team and send success response', async () => {
      mockReq.params.id = 'proj_1';
      mockReq.query.requirements = 'node';
      const mockSuggestion = { team: [] };
      (aiService.suggestTeam as jest.Mock).mockResolvedValue(mockSuggestion);

      await managerProjectController.suggestTeam(mockReq, mockRes, mockNext);

      expect(aiService.suggestTeam).toHaveBeenCalledWith('proj_1', 'manager_123', 'node');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockSuggestion, 'AI Team Suggestion generated successfully');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Error');
      (aiService.suggestTeam as jest.Mock).mockRejectedValue(error);

      await managerProjectController.suggestTeam(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getMyProjects', () => {
    it('should get projects and send success response', async () => {
      const mockProjects = [{ id: 'proj_1' }];
      projectService.listProjects.mockResolvedValue(mockProjects);

      await managerProjectController.getMyProjects(mockReq, mockRes, mockNext);

      expect(projectService.listProjects).toHaveBeenCalledWith({ managerId: 'manager_123' });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockProjects, 'Manager projects retrieved');
    });
  });

  describe('generateRiskSummary', () => {
    it('should generate risk summary and send success response', async () => {
      mockReq.params.id = 'proj_1';
      const mockSummary = { risk: 'low' };
      (aiService.generateRiskSummary as jest.Mock).mockResolvedValue(mockSummary);

      await managerProjectController.generateRiskSummary(mockReq, mockRes, mockNext);

      expect(aiService.generateRiskSummary).toHaveBeenCalledWith('proj_1', 'manager_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockSummary, 'AI Risk Summary generated successfully');
    });
  });

  describe('teamSearch', () => {
    it('should perform team search and send success response', async () => {
      mockReq.query.query = 'dev';
      const mockResult = [{ id: 'emp_1' }];
      (aiService.teamSearch as jest.Mock).mockResolvedValue(mockResult);

      await managerProjectController.teamSearch(mockReq, mockRes, mockNext);

      expect(aiService.teamSearch).toHaveBeenCalledWith('dev', 'manager_123');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'AI Team Search generated successfully');
    });
  });
});
