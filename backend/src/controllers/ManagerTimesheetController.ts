import timesheetService from '../services/TimesheetService';
import { sendSuccess } from '../utils/responseHelper';

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

  /** GET /api/manager/timesheets/pending-requests */
  async getPendingRequests(req, res, next) {
    try {
      const timesheets = await timesheetService.getPendingAccessRequests(req.user.id);
      sendSuccess(res, timesheets, 'Pending access requests retrieved');
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/manager/timesheets/:id/review-access */
  async reviewTimesheetAccess(req, res, next) {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      const timesheet = await timesheetService.reviewTimesheetAccessRequest(req.user.id, id, approved);
      sendSuccess(res, timesheet, `Timesheet access ${approved ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      next(error);
    }
  }
}

export default new ManagerTimesheetController();
