import cron from 'node-cron';
import {
  employeeRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
  projectRepository,
} from '../repositories';
import { getLastCompletedWeekStart } from '../utils/dateHelpers';
import emailService from './EmailService';
import { MILESTONE_STATUS, PROJECT_STATUS } from '../config/constants';

class SchedulerService {
  cronJob: any;
  reminderCron: any;
  isRunning: boolean;
  constructor() {
    this.cronJob = null;
    this.reminderCron = null;
    this.isRunning = false;
  }

  async start() {
    try {
      const config = await systemConfigRepository.get();
      const intervalHours = config?.schedulerIntervalHours || 24;

      const cronExpr = `0 */${intervalHours} * * *`;
      console.log(`⏱️  Scheduler initialized. Interval: ${intervalHours}h (${cronExpr})`);

      this.cronJob = cron.schedule(cronExpr, async () => {
        await this.runAllJobs();
      });

      // Timesheet Reminder cron - Friday 4:00 PM
      this.reminderCron = cron.schedule('0 16 * * 5', async () => {
        console.log('⏱️  Running Friday Timesheet Reminders...');
        await this._sendTimesheetReminders();
      });

      setTimeout(() => this.runAllJobs(), 5000);
      
    } catch (err) {
      console.error('❌ Failed to start SchedulerService:', err.message);
    }
  }

  async runAllJobs() {
    if (this.isRunning) {
      console.log('⏱️  Scheduler jobs are already running. Skipping duplicate trigger.');
      return;
    }

    this.isRunning = true;
    console.log('\n⏱️  --- Starting Scheduler Jobs ---');

    try {
      await this._processAllocationExpiry();
      await this._processMissedTimesheets();
      await this._processAtRiskMilestones();
      await this._processProjectDeadlines();
      console.log('⏱️  --- Scheduler Jobs Completed Successfully ---\n');
    } catch (err) {
      console.error('❌ Scheduler Jobs Failed:', err);
    } finally {
      this.isRunning = false;
    }
  }

  stop() {
    if (this.cronJob) this.cronJob.stop();
    if (this.reminderCron) this.reminderCron.stop();
    console.log('⏱️  Scheduler stopped');
  }

  async _processAllocationExpiry() {
    console.log('  -> Running Allocation Expiry Job...');
    let expiredCount = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeAllocations = await allocationRepository.findAll({ isActive: true });
      const expired = activeAllocations.filter((a: any) => new Date(a.toDate) < today);

      for (const allocation of expired) {
        await allocationRepository.endAllocation(allocation._id, allocation.toDate);
        expiredCount++;
        const empId = (allocation as any).employeeId._id || (allocation as any).employeeId;
        await this._recalculateUtilisation(empId, today);
      }
      console.log(`     Processed ${expiredCount} expired allocations.`);
    } catch (err) {
      console.error('     Error in Allocation Expiry Job:', err);
    }
  }

  async _processMissedTimesheets() {
    console.log('  -> Running Missed Timesheet Job...');
    let missedCount = 0;
    try {
      const lastWeekStart = getLastCompletedWeekStart();
      const employees = await employeeRepository.findAll({ isActive: true });

      for (const employee of employees) {
        const empId = employee._id;
        const exists = await timesheetRepository.exists(empId, lastWeekStart);

        if (!exists) {
          await timesheetRepository.insertMissed(empId, lastWeekStart);
          missedCount++;
          
          const activeAllocations = await allocationRepository.findActiveByEmployeeOnDate(empId, new Date());
          const managersNotified = new Set();
          for (const alloc of activeAllocations) {
            const project = await projectRepository.findById((alloc as any).projectId._id || (alloc as any).projectId);
            if (project && project.managerId) {
              const managerId = (project.managerId as any)._id?.toString() || project.managerId.toString();
              if (!managersNotified.has(managerId)) {
                managersNotified.add(managerId);
                emailService.sendMissedTimesheetAlertEmail(project.managerId, employee, lastWeekStart).catch(console.error);
              }
            }
          }
        }
      }
      console.log(`     Processed ${missedCount} missed timesheets for week starting ${lastWeekStart.toLocaleDateString()}.`);
    } catch (err) {
      console.error('     Error in Missed Timesheet Job:', err);
    }
  }

  async _processAtRiskMilestones() {
    console.log('  -> Running At-Risk Milestones Job...');
    let riskCount = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeProjects = await projectRepository.findActiveProjects();
      
      for (const project of activeProjects) {
        for (const milestone of (project as any).milestones) {
          if ((milestone.status === MILESTONE_STATUS.NOT_STARTED || milestone.status === MILESTONE_STATUS.IN_PROGRESS) && 
              new Date(milestone.dueDate) < today) {
            await projectRepository.updateMilestoneStatus(project._id, milestone._id, MILESTONE_STATUS.AT_RISK);
            riskCount++;
            
            if ((project as any).managerId) {
              emailService.sendAtRiskMilestoneEmail((project as any).managerId, project, milestone).catch(console.error);
            }
          }
        }
      }
      console.log(`     Flagged ${riskCount} milestones as AT_RISK.`);
    } catch (err) {
      console.error('     Error in At-Risk Milestones Job:', err);
    }
  }

  async _processProjectDeadlines() {
    console.log('  -> Running Project Deadlines Job...');
    let deadlineCount = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 7); // Exactly 7 days from now

      const activeProjects = await projectRepository.findActiveProjects();
      for (const project of activeProjects) {
        const endDate = new Date((project as any).endDate);
        endDate.setHours(0, 0, 0, 0);
        
        if (endDate.getTime() === targetDate.getTime()) {
          deadlineCount++;
          if ((project as any).managerId) {
            emailService.sendProjectDeadlineWarningEmail((project as any).managerId, project, 7).catch(console.error);
          }
        }
      }
      console.log(`     Sent ${deadlineCount} project deadline warnings.`);
    } catch (err) {
      console.error('     Error in Project Deadlines Job:', err);
    }
  }

  async _sendTimesheetReminders() {
    try {
      const employees = await employeeRepository.findAll({ isActive: true });
      let sentCount = 0;
      for (const employee of employees) {
        if ((employee as any).userId && (employee as any).userId.email) {
          emailService.sendTimesheetReminderEmail((employee as any).userId).catch(console.error);
          sentCount++;
        }
      }
      console.log(`  -> Sent ${sentCount} timesheet reminders.`);
    } catch (err) {
      console.error('  -> Error sending timesheet reminders:', err);
    }
  }

  async _recalculateUtilisation(employeeId: any, today: Date) {
    const activeAllocations = await allocationRepository.findActiveByEmployeeOnDate(
      employeeId, today
    );
    const totalUtil = activeAllocations.reduce((sum: number, a: any) => sum + a.utilisation, 0);
    const status = totalUtil > 0 ? 'ALLOCATED' : 'BENCH';
    await employeeRepository.update(employeeId, {
      currentUtilisation: totalUtil,
      status,
    });
  }
}

export default new SchedulerService();
