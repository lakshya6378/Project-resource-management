import { SystemConfig } from '../models';

/**
 * SystemConfigRepository — Data Access Layer for SystemConfig model.
 *
 * Singleton pattern at the data layer: only one config document exists.
 * get() always returns that single document.
 * update() always updates that single document.
 */
class SystemConfigRepository {
  /**
   * Get the singleton config document.
   * Returns null if no config exists (pre-seed state).
   */
  async get() {
    return SystemConfig.findOne();
  }

  /**
   * Update the singleton config document.
   * Uses upsert to create if it doesn't exist yet.
   */
  async update(data) {
    return SystemConfig.findOneAndUpdate(
      {},    // match any document (there's only one)
      data,
      {
        returnDocument: 'after',
        upsert: true,        // create if doesn't exist
        runValidators: true,
      }
    );
  }
}

export default new SystemConfigRepository();
