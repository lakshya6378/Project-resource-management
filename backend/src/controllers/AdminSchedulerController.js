const schedulerService = require('../services/SchedulerService');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * AdminSchedulerController
 * 
 * Allows admins to manually trigger background jobs
 * without waiting for the cron interval. Useful for testing
 * and manual overrides.
 */
class AdminSchedulerController {
  /** POST /api/admin/scheduler/trigger */
  async triggerJobs(req, res, next) {
    try {
      // Fire and forget (don't await the whole job run, just start it)
      schedulerService.runAllJobs().catch(console.error);
      
      sendSuccess(res, null, 'Scheduler jobs triggered successfully in the background');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminSchedulerController();
