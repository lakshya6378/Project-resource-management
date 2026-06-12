import { Timesheet } from '../models';

/**
 * TimesheetRepository — Data Access Layer for Timesheet model.
 *
 * Unique compound index on {employeeId, weekStart} prevents
 * duplicate submissions at the database level.
 */
class TimesheetRepository {
  async findById(id) {
    return Timesheet.findById(id).populate('entries.projectId', 'name');
  }

  async findByEmployee(employeeId) {
    return Timesheet.find({ resourceId: employeeId })
      .populate('entries.projectId', 'name')
      .sort({ weekStart: -1 });
  }

  async findByEmployeeAndWeek(employeeId, weekStart) {
    return Timesheet.findOne({ resourceId: employeeId, weekStart })
      .populate('entries.projectId', 'name');
  }

  async create(data) {
    const timesheet = new Timesheet(data);
    return timesheet.save();
  }

  /**
   * Insert a MISSED timesheet record (created by scheduler).
   */
  async insertMissed(employeeId, weekStart) {
    const timesheet = new Timesheet({
      resourceId: employeeId,
      weekStart,
      status: 'MISSED',
      totalHours: 0,
      entries: [],
    });
    return timesheet.save();
  }

  /**
   * Find all timesheets for a given week (used for manager's team view).
   * Returns timesheets for multiple employees.
   */
  async findByWeek(weekStart) {
    return Timesheet.find({ weekStart })
      .populate('resourceId', 'fullName department')
      .populate('entries.projectId', 'name');
  }

  /**
   * Find all timesheets for multiple employees in a given week.
   * @param {ObjectId[]} employeeIds - Array of employee IDs
   * @param {Date} weekStart - Monday of the target week
   */
  async findByEmployeesAndWeek(employeeIds, weekStart) {
    return Timesheet.find({
      resourceId: { $in: employeeIds },
      weekStart,
    })
      .populate('resourceId', 'fullName department')
      .populate('entries.projectId', 'name');
  }

  /**
   * Find pending access requests for multiple employees.
   */
  async findPendingAccessRequestsByEmployees(employeeIds) {
    return Timesheet.find({
      resourceId: { $in: employeeIds },
      'accessRequest.status': 'PENDING',
    })
      .populate('resourceId', 'fullName department')
      .populate('entries.projectId', 'name');
  }

  /**
   * Check if a timesheet exists for a specific employee and week.
   * Used by scheduler to detect missed timesheets.
   */
  async exists(employeeId, weekStart) {
    const count = await Timesheet.countDocuments({ resourceId: employeeId, weekStart });
    return count > 0;
  }
}

export default new TimesheetRepository();
