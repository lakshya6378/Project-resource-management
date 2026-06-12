import timesheetService from '../services/TimesheetService';
import allocationService from '../services/AllocationService';
import { employeeRepository } from '../repositories';
import { sendSuccess } from '../utils/responseHelper';
import { AppError } from '../middleware/errorHandler';

/**
 * EmployeeController — Request Handlers for Employee Self-Service
 *
 * Employees can:
 *   - View their own allocations
 *   - Submit their own timesheets
 *   - View their timesheet history
 */
import resourceService from '../services/ResourceService';

class EmployeeController {
  /**
   * Helper: get the employee record linked to the current user.
   */
  async _getMyEmployee(userId) {
    const employee = await resourceService.getEmployeeById(userId);
    if (!employee) {
      throw new AppError('No employee profile linked to your account', 404);
    }
    return employee;
  }

  /** GET /api/employee/my-allocations */
  getMyAllocations = async (req, res, next) => {
    try {
      const employee = await this._getMyEmployee(req.user.id);
      const allocations = await allocationService.listByEmployee(employee._id);
      sendSuccess(res, allocations, 'Your allocations retrieved');
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/employee/timesheets */
  submitTimesheet = async (req, res, next) => {
    try {
      const employee = await this._getMyEmployee(req.user.id);
      const timesheet = await timesheetService.submitTimesheet(req.body, employee._id);
      sendSuccess(res, timesheet, 'Timesheet submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/employee/timesheets */
  getMyTimesheets = async (req, res, next) => {
    try {
      const employee = await this._getMyEmployee(req.user.id);
      const timesheets = await timesheetService.getEmployeeTimesheets(employee._id);
      sendSuccess(res, timesheets, 'Your timesheets retrieved');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/employee/timesheets/:weekStart */
  getTimesheetByWeek = async (req, res, next) => {
    try {
      const employee = await this._getMyEmployee(req.user.id);
      const timesheet = await timesheetService.getTimesheetByWeek(
        employee._id, req.params.weekStart
      );
      sendSuccess(res, timesheet, 'Timesheet retrieved');
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/employee/timesheets/access-request */
  requestTimesheetAccess = async (req, res, next) => {
    try {
      const employee = await this._getMyEmployee(req.user.id);
      const timesheet = await timesheetService.requestMissedTimesheetAccess(
        employee._id, req.body.weekStart, req.body.reason
      );
      sendSuccess(res, timesheet, 'Timesheet access requested successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeController();
