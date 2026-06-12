import timesheetService from '../../../src/services/TimesheetService';
import { timesheetRepository, allocationRepository, userRepository, systemConfigRepository } from '../../../src/repositories';
import { AppError } from '../../../src/middleware/errorHandler';

jest.mock('../../../src/repositories', () => ({
  timesheetRepository: {
    findByEmployeeAndWeek: jest.fn(),
    create: jest.fn(),
    findByEmployee: jest.fn(),
    findPendingByManager: jest.fn(),
    findById: jest.fn(),
  },
  allocationRepository: {
    findActiveByEmployeeInRange: jest.fn(),
    findAll: jest.fn(),
  },
  userRepository: {
    findById: jest.fn(),
  },
  systemConfigRepository: {
    get: jest.fn(),
  },
}));

jest.mock('../../../src/models', () => ({
  Timesheet: {
    exists: jest.fn().mockResolvedValue(false),
  }
}));

describe('TimesheetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitTimesheet', () => {
    const dto = {
      weekStart: new Date().toISOString(), // Use current date to avoid future week error
      entries: [
        { projectId: 'proj_1', hours: 40, activityTags: ['dev'] }
      ]
    };
    const empId = 'emp_1';

    it('should successfully submit timesheet', async () => {
      (timesheetRepository.findByEmployeeAndWeek as jest.Mock).mockResolvedValue(null);
      (userRepository.findById as jest.Mock).mockResolvedValue({ roleId: { name: 'EMPLOYEE' } });
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ maxWeeklyHours: 40 });
      (allocationRepository.findActiveByEmployeeInRange as jest.Mock).mockResolvedValue([
        { projectId: { _id: 'proj_1' } }
      ]);
      (timesheetRepository.create as jest.Mock).mockResolvedValue({ _id: 'ts_1' });

      const result = await timesheetService.submitTimesheet(dto, empId);

      expect(result).toEqual({ _id: 'ts_1' });
      expect(timesheetRepository.create).toHaveBeenCalled();
    });

    it('should throw error if future week', async () => {
      const futureDto = { ...dto, weekStart: '3026-01-01' };
      
      await expect(timesheetService.submitTimesheet(futureDto, empId))
        .rejects.toThrow('Cannot submit timesheets for future weeks');
    });

    it('should throw error if timesheet already submitted', async () => {
      (timesheetRepository.findByEmployeeAndWeek as jest.Mock).mockResolvedValue({ status: 'SUBMITTED' });

      await expect(timesheetService.submitTimesheet(dto, empId))
        .rejects.toThrow('Timesheet already submitted for this week');
    });

    it('should throw error if not allocated to project', async () => {
      (timesheetRepository.findByEmployeeAndWeek as jest.Mock).mockResolvedValue(null);
      (userRepository.findById as jest.Mock).mockResolvedValue({ roleId: { name: 'EMPLOYEE' } });
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ maxWeeklyHours: 40 });
      (allocationRepository.findActiveByEmployeeInRange as jest.Mock).mockResolvedValue([
        { projectId: 'proj_2' } // Allocated to proj_2, but dto logs proj_1
      ]);

      await expect(timesheetService.submitTimesheet(dto, empId))
        .rejects.toThrow(/Employee is not allocated to project/);
    });

    it('should throw error if exceeds max weekly hours', async () => {
      const overDto = {
        weekStart: new Date().toISOString(),
        entries: [{ projectId: 'proj_1', hours: 41, activityTags: [] }]
      };
      (timesheetRepository.findByEmployeeAndWeek as jest.Mock).mockResolvedValue(null);
      (userRepository.findById as jest.Mock).mockResolvedValue({ roleId: { name: 'EMPLOYEE' } });
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ maxWeeklyHours: 40 });
      (allocationRepository.findActiveByEmployeeInRange as jest.Mock).mockResolvedValue([
        { projectId: 'proj_1' }
      ]);

      await expect(timesheetService.submitTimesheet(overDto, empId))
        .rejects.toThrow(/Total hours \(41\) exceeds maximum weekly hours/);
    });
  });

  describe('getEmployeeTimesheets', () => {
    it('should return timesheets for employee', async () => {
      (timesheetRepository.findByEmployee as jest.Mock).mockResolvedValue([{ _id: 'ts_1' }]);
      const result = await timesheetService.getEmployeeTimesheets('emp_1');
      expect(result.length).toBe(1);
    });
  });

  describe('getTimesheetByWeek', () => {
    it('should return timesheet if found', async () => {
      (timesheetRepository.findByEmployeeAndWeek as jest.Mock).mockResolvedValue({ _id: 'ts_1' });
      const result = await timesheetService.getTimesheetByWeek('emp_1', '2026-01-01');
      expect(result._id).toBe('ts_1');
    });

    it('should throw error if not found', async () => {
      (timesheetRepository.findByEmployeeAndWeek as jest.Mock).mockResolvedValue(null);
      await expect(timesheetService.getTimesheetByWeek('emp_1', '2026-01-01'))
        .rejects.toThrow('Timesheet not found for this week');
    });
  });
});
