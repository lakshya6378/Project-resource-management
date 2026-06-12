import schedulerService from '../../../src/services/SchedulerService';
import cron from 'node-cron';
import {
  userRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
  projectRepository,
} from '../../../src/repositories';
import emailService from '../../../src/services/EmailService';

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

jest.mock('../../../src/repositories', () => ({
  userRepository: { findAll: jest.fn(), update: jest.fn() },
  allocationRepository: { findAll: jest.fn(), endAllocation: jest.fn(), findActiveByEmployeeOnDate: jest.fn() },
  timesheetRepository: { exists: jest.fn(), insertMissed: jest.fn() },
  systemConfigRepository: { get: jest.fn() },
  projectRepository: { findActiveProjects: jest.fn(), findById: jest.fn(), updateMilestoneStatus: jest.fn() },
}));

jest.mock('../../../src/services/EmailService', () => ({
  sendMissedTimesheetAlertEmail: jest.fn().mockResolvedValue(null),
  sendAtRiskMilestoneEmail: jest.fn().mockResolvedValue(null),
  sendProjectDeadlineWarningEmail: jest.fn().mockResolvedValue(null),
  sendTimesheetReminderEmail: jest.fn().mockResolvedValue(null),
}));

describe('SchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('start and stop', () => {
    it('should start and schedule cron jobs', async () => {
      (systemConfigRepository.get as jest.Mock).mockResolvedValue({ schedulerIntervalHours: 4 });
      await schedulerService.start();
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });

    it('should stop cron jobs', () => {
      schedulerService.stop();
      expect(schedulerService.cronJob.stop.name).toBeTruthy();
    });
  });

  describe('runAllJobs', () => {
    it('should run all processing methods', async () => {
      schedulerService.isRunning = false;
      const processAllocationSpy = jest.spyOn(schedulerService as any, '_processAllocationExpiry').mockResolvedValue(null);
      const processMissedSpy = jest.spyOn(schedulerService as any, '_processMissedTimesheets').mockResolvedValue(null);
      const processAtRiskSpy = jest.spyOn(schedulerService as any, '_processAtRiskMilestones').mockResolvedValue(null);
      const processDeadlinesSpy = jest.spyOn(schedulerService as any, '_processProjectDeadlines').mockResolvedValue(null);

      await schedulerService.runAllJobs();

      expect(processAllocationSpy).toHaveBeenCalled();
      expect(processMissedSpy).toHaveBeenCalled();
      expect(processAtRiskSpy).toHaveBeenCalled();
      expect(processDeadlinesSpy).toHaveBeenCalled();
    });
  });
});
