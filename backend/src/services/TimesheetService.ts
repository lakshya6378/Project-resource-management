import {
  timesheetRepository,
  allocationRepository,
  userRepository,
  systemConfigRepository,
} from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { normalizeToMonday } from '../utils/dateHelpers';

/**
 * TimesheetService — Weekly Timesheet Management
 *
 * Handles submission and retrieval of weekly timesheets.
 * Employees submit timesheets; managers view team submissions.
 *
 * Key business rules:
 *   - weekStart is always normalized to Monday
 *   - No future week submissions
 *   - No duplicate submissions for same {employeeId, weekStart}
 *   - Can only log hours for projects the employee is allocated to
 *   - Total hours ≤ maxWeeklyHours from system config
 */
class TimesheetService {
  /**
   * Submit a timesheet for a specific week.
   *
   * @param {Object} dto - { weekStart, entries: [{ projectId, hours, activityTags }] }
   * @param {string} employeeId - Employee submitting the timesheet
   */
  async submitTimesheet(dto, employeeId) {
    const { weekStart, entries } = dto;

    // Normalize weekStart to Monday
    const normalizedWeekStart = normalizeToMonday(new Date(weekStart));

    // No future week submissions
    const currentWeekStart = normalizeToMonday(new Date());
    if (normalizedWeekStart > currentWeekStart) {
      throw new AppError('Cannot submit timesheets for future weeks', 400);
    }

    // Check if employee has any frozen timesheets without approved access
    const { Timesheet } = require('../models');
    const hasFrozen = await Timesheet.exists({
      resourceId: employeeId,
      status: 'FROZEN',
      'accessRequest.status': { $ne: 'APPROVED' }
    });
    if (hasFrozen) {
      throw new AppError('Your timesheet access is frozen. Please contact your manager to restore access.', 403);
    }

    // Check for duplicate or missed/frozen timesheet
    const existing = await timesheetRepository.findByEmployeeAndWeek(
      employeeId, normalizedWeekStart
    );
    if (existing) {
      const status = (existing as any).status;
      if ((status === 'MISSED' || status === 'FROZEN') && (existing as any).accessRequest?.status === 'APPROVED') {
        // Allow updating the missed or frozen timesheet
      } else {
        throw new AppError('Timesheet already submitted for this week', 409);
      }
    }

    // Validate employee exists
    const employee = await userRepository.findById(employeeId);
    if (!employee || (employee.roleId as any)?.name !== 'EMPLOYEE') {
      throw new AppError('Employee not found or invalid role', 404);
    }

    // Get system config for maxWeeklyHours
    const config = await systemConfigRepository.get();
    const maxHours = config?.maxWeeklyHours || 40;

    // Get employee's active allocations for this week
    const weekEnd = new Date(normalizedWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday of the week

    const activeAllocations = await allocationRepository.findActiveByEmployeeInRange(
      employeeId, normalizedWeekStart, weekEnd
    );

    const allocatedProjectIds = activeAllocations.map((a: any) => {
      const pid = a.projectId?._id || a.projectId;
      return pid ? pid.toString() : null;
    }).filter(Boolean);

    // Validate entries
    let totalHours = 0;
    for (const entry of entries) {
      const entryProjectId = entry.projectId ? entry.projectId.toString() : null;

      // Check employee is allocated to this project
      if (!allocatedProjectIds.includes(entryProjectId)) {
        throw new AppError(
          `Employee is not allocated to project ${entryProjectId} during this week`,
          400
        );
      }

      if (entry.hours < 0) {
        throw new AppError('Hours cannot be negative', 400);
      }

      totalHours += entry.hours;
    }

    // Check total hours against max
    if (totalHours > maxHours) {
      throw new AppError(
        `Total hours (${totalHours}) exceeds maximum weekly hours (${maxHours})`,
        400
      );
    }

    if (existing) {
      (existing as any).status = 'SUBMITTED';
      (existing as any).totalHours = totalHours;
      (existing as any).entries = entries;
      (existing as any).submittedAt = new Date();
      await (existing as any).save();
      return existing;
    } else {
      const timesheet = await timesheetRepository.create({
        resourceId: employeeId,
        weekStart: normalizedWeekStart,
        status: 'SUBMITTED',
        totalHours,
        entries,
        submittedAt: new Date(),
      });
      return timesheet;
    }
  }

  async getEmployeeTimesheets(employeeId) {
    return timesheetRepository.findByEmployee(employeeId);
  }

  async getTimesheetByWeek(employeeId, weekStart) {
    const normalizedWeekStart = normalizeToMonday(new Date(weekStart));
    const timesheet = await timesheetRepository.findByEmployeeAndWeek(
      employeeId, normalizedWeekStart
    );
    if (!timesheet) {
      throw new AppError('Timesheet not found for this week', 404);
    }
    return timesheet;
  }

  async getTeamTimesheets(managerId, weekStart) {
    const normalizedWeekStart = normalizeToMonday(new Date(weekStart));

    const allocations = await allocationRepository.findAll({ isActive: true });
    const managerAllocations = allocations.filter(
      (a: any) => {
        const mgrId = a.managerId?._id || a.managerId;
        return mgrId && managerId ? mgrId.toString() === managerId.toString() : false;
      }
    );

    const employeeIds = [...new Set(
      managerAllocations.map((a: any) => {
        const resId = a.resourceId?._id || a.resourceId;
        return resId ? resId.toString() : null;
      }).filter(id => id !== null)
    )];

    if (employeeIds.length === 0) {
      return [];
    }

    return timesheetRepository.findByEmployeesAndWeek(employeeIds, normalizedWeekStart);
  }

  async getPendingAccessRequests(managerId) {
    const allocations = await allocationRepository.findAll({ isActive: true });
    const managerAllocations = allocations.filter(
      (a: any) => {
        const mgrId = a.managerId?._id || a.managerId;
        return mgrId && managerId ? mgrId.toString() === managerId.toString() : false;
      }
    );

    const employeeIds = [...new Set(
      managerAllocations.map((a: any) => {
        const resId = a.resourceId?._id || a.resourceId;
        return resId ? resId.toString() : null;
      }).filter(id => id !== null)
    )];

    if (employeeIds.length === 0) {
      return [];
    }

    return timesheetRepository.findPendingAccessRequestsByEmployees(employeeIds);
  }

  async requestMissedTimesheetAccess(employeeId, weekStart, reason) {
    const normalizedWeekStart = normalizeToMonday(new Date(weekStart));
    const timesheet = await timesheetRepository.findByEmployeeAndWeek(employeeId, normalizedWeekStart);
    if (!timesheet) throw new AppError('No missed timesheet found for this week', 404);
    if ((timesheet as any).status !== 'MISSED' && (timesheet as any).status !== 'FROZEN') throw new AppError('Timesheet is not missed or frozen', 400);
    if ((timesheet as any).accessRequest?.status === 'PENDING') throw new AppError('Access request already pending', 400);

    (timesheet as any).accessRequest = {
      requested: true,
      reason,
      status: 'PENDING',
      requestedAt: new Date()
    };
    await (timesheet as any).save();
    return timesheet;
  }

  async reviewTimesheetAccessRequest(managerId, timesheetId, approved) {
    const timesheet = await timesheetRepository.findById(timesheetId);
    if (!timesheet) throw new AppError('Timesheet not found', 404);
    if ((timesheet as any).status !== 'MISSED' && (timesheet as any).status !== 'FROZEN') throw new AppError('Timesheet is not missed or frozen', 400);
    if ((timesheet as any).accessRequest?.status !== 'PENDING') throw new AppError('No pending access request', 400);

    // Note: We might want to verify if the manager actually manages this employee.
    // Assuming yes for simplicity right now.
    
    (timesheet as any).accessRequest.status = approved ? 'APPROVED' : 'REJECTED';
    await (timesheet as any).save();
    return timesheet;
  }
}

export default new TimesheetService();
