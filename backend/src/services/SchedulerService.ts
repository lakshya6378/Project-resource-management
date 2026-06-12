import cron from 'node-cron';
import {
  userRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
  projectRepository,
} from '../repositories';
import { getLastCompletedWeekStart } from '../utils/dateHelpers';
import emailService from './EmailService';
import { MILESTONE_STATUS, PROJECT_STATUS, HEALTH_STATUS } from '../config/constants';

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
        const empId = (allocation as any).resourceId._id || (allocation as any).resourceId;
        await this._recalculateUtilisation(empId, today);
      }
      console.log(`     Processed ${expiredCount} expired allocations.`);
    } catch (err) {
      console.error('     Error in Allocation Expiry Job:', err);
    }
  }

  async _processMissedTimesheets() {
    console.log('  -> Running Missed Timesheet Job...');
    let processCount = 0;
    try {
      const lastWeekStart = getLastCompletedWeekStart();

      // Step 1: Find completely missing timesheets and insert them as MISSED
      const employees = await userRepository.findAll({ isActive: true });
      for (const employee of employees) {
        if ((employee.roleId as any)?.name !== 'EMPLOYEE') continue;
        const empId = employee._id;
        const exists = await timesheetRepository.exists(empId, lastWeekStart);
        if (!exists) {
          await timesheetRepository.insertMissed(empId, lastWeekStart);
        }
      }

      // Step 2: Process all MISSED timesheets for last week
      const missedTimesheets = await timesheetRepository.findMissed(lastWeekStart);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, etc.

      for (const ts of missedTimesheets) {
        if (ts.lastReminderSentAt) {
          const lastSent = new Date(ts.lastReminderSentAt);
          lastSent.setHours(0, 0, 0, 0);
          if (lastSent.getTime() === today.getTime()) continue; // Only process once per day
        }

        const employee = ts.resourceId;
        const activeAllocations = await allocationRepository.findActiveByEmployeeOnDate(employee._id, today);
        let reportingManager = null;
        for (const alloc of activeAllocations) {
          const project = await projectRepository.findById((alloc as any).projectId._id || (alloc as any).projectId);
          if (project && project.managerId) {
            reportingManager = project.managerId;
            break;
          }
        }

        if (dayOfWeek === 1 && (ts.reminderCount as number) < 1 && ts.status === 'MISSED') {
          // Monday: Reminder 1
          await emailService.sendTimesheetReminderEmail(employee, 1).catch(console.error);
          await timesheetRepository.update(ts._id, { reminderCount: 1, lastReminderSentAt: new Date() });
          processCount++;
        }
        else if (dayOfWeek === 2 && (ts.reminderCount as number) < 2 && ts.status === 'MISSED') {
          // Tuesday: Reminder 2
          await emailService.sendTimesheetReminderEmail(employee, 2).catch(console.error);
          await timesheetRepository.update(ts._id, { reminderCount: 2, lastReminderSentAt: new Date() });
          processCount++;
        }
        else if (dayOfWeek >= 3 && ts.status === 'MISSED') {
          // Wednesday onwards: Freeze
          await timesheetRepository.update(ts._id, { status: 'FROZEN', lastReminderSentAt: new Date() });
          if (reportingManager) {
            await emailService.sendTimesheetFreezeEmail(reportingManager, employee).catch(console.error);
          }
          processCount++;
        }
      }

      console.log(`     Processed ${processCount} timesheet reminder/freeze actions.`);
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
      const aiService = require('./AiService').default;
      const projectService = require('./ProjectService').default;

      for (const project of activeProjects) {
        let isProjectAtRisk = false;

        for (const milestone of (project as any).milestones) {
          if ((milestone.status === MILESTONE_STATUS.NOT_STARTED || milestone.status === MILESTONE_STATUS.IN_PROGRESS) &&
            new Date(milestone.dueDate) < today) {
            await projectRepository.updateMilestoneStatus(project._id, milestone._id, MILESTONE_STATUS.AT_RISK);
            isProjectAtRisk = true;
          }
        }

        // Also check overall health flags (e.g. low hours logged)
        const { healthStatus } = await projectService._computeProjectHealthAndFlags(project);

        if (isProjectAtRisk || healthStatus === HEALTH_STATUS.AT_RISK) {
          riskCount++;
          const manager = (project as any).managerId;
          console.log(manager);
          if (manager) {
            let aiSummary = "No AI summary could be generated.";
            let suggestedHelp = "No AI suggestions could be generated.";

            try {
              const managerIdStr = manager._id ? manager._id.toString() : manager.toString();
              const summaryRes = await aiService.generateRiskSummary(project._id, managerIdStr);
              if (summaryRes && summaryRes.summary) aiSummary = summaryRes.summary;

              const suggestRes = await aiService.suggestTeam(project._id, managerIdStr, "Need extra capacity to mitigate current project risks");
              if (suggestRes) {
                const team = (suggestRes as any).suggestedTeam || [];
                suggestedHelp = team.map((t: any) => `- **${t.name}**: ${t.reasoning}`).join('\n');
              }
            } catch (e) {
              console.error("AI Generation error during scheduler:", e);
            }

            emailService.sendProjectAtRiskEmail(manager, project, aiSummary, suggestedHelp).catch(console.error);
          }
        }
      }
      console.log(`     Flagged/Notified ${riskCount} projects as AT_RISK.`);
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
      const employees = await userRepository.findAll({ isActive: true });
      let sentCount = 0;
      for (const employee of employees) {
        if ((employee.roleId as any)?.name !== 'EMPLOYEE') continue;
        if ((employee as any)._id && (employee as any)._id.email) {
          emailService.sendTimesheetReminderEmail((employee as any), 0).catch(console.error);
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
    await userRepository.update(employeeId, {
      'resourceData.currentUtilisation': totalUtil,
      'resourceData.status': status,
    });
  }
}

export default new SchedulerService();
