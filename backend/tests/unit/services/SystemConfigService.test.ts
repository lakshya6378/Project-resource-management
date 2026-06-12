import systemConfigService from '../../../src/services/SystemConfigService';
import { systemConfigRepository } from '../../../src/repositories';
import { LLM_PROVIDERS } from '../../../src/config/constants';

jest.mock('../../../src/repositories', () => ({
  systemConfigRepository: {
    get: jest.fn(),
    update: jest.fn(),
  },
}));

describe('SystemConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return existing config', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ llmProvider: 'GEMINI' });
      const config = await systemConfigService.getConfig();
      expect(config.llmProvider).toBe('GEMINI');
    });

    it('should create default config if not exists', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue(null);
      (systemConfigRepository.update as jest.Mock).mockResolvedValue({ llmProvider: LLM_PROVIDERS.GEMINI });

      const config = await systemConfigService.getConfig();
      expect(systemConfigRepository.update).toHaveBeenCalledWith(expect.objectContaining({
        llmProvider: LLM_PROVIDERS.GEMINI
      }));
      expect(config.llmProvider).toBe(LLM_PROVIDERS.GEMINI);
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      (systemConfigRepository.update as jest.Mock).mockResolvedValue({ llmProvider: 'GROQ', updatedBy: 'admin1' });

      const config = await systemConfigService.updateConfig({ llmProvider: 'GROQ' }, 'admin1');
      expect(systemConfigRepository.update).toHaveBeenCalledWith(expect.objectContaining({
        llmProvider: 'GROQ',
        updatedBy: 'admin1'
      }));
      expect(config.llmProvider).toBe('GROQ');
    });

    it('should throw error for invalid LLM provider', async () => {
      await expect(systemConfigService.updateConfig({ llmProvider: 'INVALID' }, 'admin1'))
        .rejects.toThrow('Invalid LLM provider: INVALID');
    });

    it('should throw error for invalid scheduler interval', async () => {
      await expect(systemConfigService.updateConfig({ schedulerIntervalHours: 0 }, 'admin1'))
        .rejects.toThrow('Scheduler interval must be at least 1 hour');
    });

    it('should throw error for invalid max weekly hours', async () => {
      await expect(systemConfigService.updateConfig({ maxWeeklyHours: 200 }, 'admin1'))
        .rejects.toThrow('Max weekly hours must be between 1 and 168');
    });
  });
});
