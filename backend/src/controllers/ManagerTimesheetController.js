const timesheetService = require('../services/TimesheetService');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * ManagerTimesheetController — Request Handlers for Timesheet Management
 */
class ManagerTimesheetController {
  /** GET /api/manager/timesheets/team?weekStart=2026-06-01 */
  async getTeamTimesheets(req, res, next) {
    try {
      const { weekStart } = req.query;
      if (!weekStart) {
        return res.status(400).json({
          success: false,
          message: 'weekStart query parameter is required',
        });
      }
      const timesheets = await timesheetService.getTeamTimesheets(req.user.id, weekStart);
      sendSuccess(res, timesheets, 'Team timesheets retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ManagerTimesheetController();
