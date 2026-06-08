const { systemConfigRepository } = require('../repositories');
const { AppError } = require('../middleware/errorHandler');
const { LLM_PROVIDERS } = require('../config/constants');

/**
 * SystemConfigService — System Configuration Management
 *
 * Manages the singleton system config document.
 * Only accessible by Admins via the System Configuration screen.
 */
class SystemConfigService {
  /**
   * Get the current system configuration.
   * If no config exists, returns defaults.
   */
  async getConfig() {
    let config = await systemConfigRepository.get();

    if (!config) {
      // Create default config
      config = await systemConfigRepository.update({
        llmProvider: LLM_PROVIDERS.GEMINI,
        llmApiKey: '',
        schedulerIntervalHours: 4,
        maxWeeklyHours: 40,
      });
    }

    return config;
  }

  /**
   * Update the system configuration.
   *
   * @param {Object} dto - { llmProvider?, llmApiKey?, schedulerIntervalHours?, maxWeeklyHours? }
   * @param {string} adminId - ID of the admin making the change
   */
  async updateConfig(dto, adminId) {
    const allowedFields = ['llmProvider', 'llmApiKey', 'schedulerIntervalHours', 'maxWeeklyHours'];
    const updateData = { updatedBy: adminId };

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    // Validate LLM provider
    if (updateData.llmProvider && !Object.values(LLM_PROVIDERS).includes(updateData.llmProvider)) {
      throw new AppError(`Invalid LLM provider: ${updateData.llmProvider}`, 400);
    }

    // Validate scheduler interval
    if (updateData.schedulerIntervalHours !== undefined) {
      if (updateData.schedulerIntervalHours < 1) {
        throw new AppError('Scheduler interval must be at least 1 hour', 400);
      }
    }

    // Validate max weekly hours
    if (updateData.maxWeeklyHours !== undefined) {
      if (updateData.maxWeeklyHours < 1 || updateData.maxWeeklyHours > 168) {
        throw new AppError('Max weekly hours must be between 1 and 168', 400);
      }
    }

    const config = await systemConfigRepository.update(updateData);
    return config;
  }
}

module.exports = new SystemConfigService();
