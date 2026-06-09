import systemConfigService from '../services/SystemConfigService';
import { sendSuccess } from '../utils/responseHelper';

/**
 * AdminConfigController — Request Handlers for System Configuration
 */
class AdminConfigController {
  /** GET /api/admin/config */
  async getConfig(req, res, next) {
    try {
      const config = await systemConfigService.getConfig();
      sendSuccess(res, config, 'System configuration retrieved');
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/admin/config */
  async updateConfig(req, res, next) {
    try {
      const config = await systemConfigService.updateConfig(req.body, req.user.id);
      sendSuccess(res, config, 'System configuration updated');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminConfigController();
