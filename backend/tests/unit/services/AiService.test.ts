import aiService from '../../../src/services/AiService';
import { systemConfigRepository, projectRepository } from '../../../src/repositories';
import resourceService from '../../../src/services/ResourceService';
import { EmployeeSkill } from '../../../src/models';
import axios from 'axios';
import Timesheet from '../../../src/models/Timesheet';
import Allocation from '../../../src/models/Allocation';

jest.mock('../../../src/repositories', () => ({
  systemConfigRepository: {
    get: jest.fn(),
  },
  projectRepository: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../src/services/ResourceService', () => ({
  listEmployees: jest.fn(),
}));

jest.mock('../../../src/models', () => ({
  EmployeeSkill: {
    find: jest.fn(),
  },
}));

jest.mock('../../../src/models/Timesheet', () => ({
  find: jest.fn(),
}));

jest.mock('../../../src/models/Allocation', () => ({
  find: jest.fn(),
}));

jest.mock('axios');

describe('AiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('suggestTeam', () => {
    it('should throw error if AI not configured', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue(null);

      await expect(aiService.suggestTeam('proj_1', 'mgr_1'))
        .rejects.toThrow('AI is not configured. Please contact the administrator.');
    });

    it('should throw error if project not found', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ llmProvider: 'GEMINI', llmApiKey: 'key' });
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(aiService.suggestTeam('proj_1', 'mgr_1'))
        .rejects.toThrow('Project not found');
    });

    it('should throw error if not authorized', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ llmProvider: 'GEMINI', llmApiKey: 'key' });
      (projectRepository.findById as jest.Mock).mockResolvedValue({ managerId: 'mgr_2' });

      await expect(aiService.suggestTeam('proj_1', 'mgr_1'))
        .rejects.toThrow('You can only request AI suggestions for your own projects');
    });

    it('should successfully suggest a team', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ llmProvider: 'GEMINI', llmApiKey: 'key' });
      (projectRepository.findById as jest.Mock).mockResolvedValue({ managerId: 'mgr_1', name: 'Test Proj', status: 'ACTIVE' });
      
      const mockEmployees = [
        { _id: 'emp_1', fullName: 'John Doe', resourceData: { status: 'BENCH', currentUtilisation: 0 } }
      ];
      (resourceService.listEmployees as jest.Mock).mockResolvedValue({ employees: mockEmployees });

      // Mock Context dependencies
      (EmployeeSkill.find as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      (Timesheet.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      (Allocation.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"suggestedTeam": [{"name": "John Doe"}]}\n```' }]
              }
            }
          ]
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.suggestTeam('proj_1', 'mgr_1', 'Need a dev');

      expect(result).toHaveProperty('suggestedTeam');
      expect(result.suggestedTeam[0].name).toBe('John Doe');
      expect(axios.post).toHaveBeenCalled();
    });
  });

  describe('teamSearch', () => {
    it('should successfully search for a team organization wide', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ llmProvider: 'GROQ', llmApiKey: 'key' });
      
      const mockEmployees = [
        { _id: 'emp_1', fullName: 'Jane Doe', resourceData: { status: 'BENCH', currentUtilisation: 0 } }
      ];
      (resourceService.listEmployees as jest.Mock).mockResolvedValue({ employees: mockEmployees });

      // Mock Context dependencies
      (EmployeeSkill.find as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      (Timesheet.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      (Allocation.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const mockResponse = {
        data: {
          choices: [
            {
              message: { content: '{"suggestedTeam": [{"name": "Jane Doe"}]}' }
            }
          ]
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.teamSearch('Need a lead dev', 'mgr_1');

      expect(result).toHaveProperty('suggestedTeam');
      expect(result.suggestedTeam[0].name).toBe('Jane Doe');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.groq.com'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('generateRiskSummary', () => {
    it('should generate a risk summary', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ llmProvider: 'GEMINI', llmApiKey: 'key' });
      (projectRepository.findById as jest.Mock).mockResolvedValue({ name: 'Risk Proj', status: 'ACTIVE' });

      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: 'This project has no risks.' }]
              }
            }
          ]
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.generateRiskSummary('proj_1', 'mgr_1');

      expect(result.summary).toBe('This project has no risks.');
    });
  });
});
