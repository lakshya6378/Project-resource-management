const cron = require('node-cron');
const {
  employeeRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
} = require('../repositories');
const { getLastCompletedWeekStart } = require('../utils/dateHelpers');

/**
 * SchedulerService — Background Automations
 *
 * Runs periodic jobs based on the interval defined in SystemConfig.
 * 
 * Jobs:
 * 1. Allocation Expiry:
 *    Finds allocations where toDate < today and isActive = true,
 *    marks them inactive, and recalculates employee utilisation.
 *
 * 2. Missed Timesheet Detection:
 *    Checks if active employees submitted timesheets for the last
 *    completed week. If not, inserts a MISSED record.
 */
class SchedulerService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler. Usually called on server startup.
   */
  async start() {
    try {
      const config = await systemConfigRepository.get();
      const intervalHours = config?.schedulerIntervalHours || 24;

      // Create cron expression: "0 */X * * *"
      const cronExpr = `0 */${intervalHours} * * *`;
      console.log(`⏱️  Scheduler initialized. Interval: ${intervalHours}h (${cronExpr})`);

      this.cronJob = cron.schedule(cronExpr, async () => {
        await this.runAllJobs();
      });

      // Also run once immediately on startup
      setTimeout(() => this.runAllJobs(), 5000);
      
    } catch (err) {
      console.error('❌ Failed to start SchedulerService:', err.message);
    }
  }

  /**
   * Manually trigger all jobs (used by admin trigger endpoint).
   */
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
      console.log('⏱️  --- Scheduler Jobs Completed Successfully ---\n');
    } catch (err) {
      console.error('❌ Scheduler Jobs Failed:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the scheduler (used for graceful shutdown or config reload).
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('⏱️  Scheduler stopped');
    }
  }

  /**
   * Job 1: Process Allocation Expiry
   * @private
   */
  async _processAllocationExpiry() {
    console.log('  -> Running Allocation Expiry Job...');
    let expiredCount = 0;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find allocations that are active but toDate < today
      // Wait, repository doesn't have an exact method for this.
      // We can fetch all active allocations and filter, or add a method.
      // Fetching all active might be fine for MVP.
      const activeAllocations = await allocationRepository.findAll({ isActive: true });

      const expired = activeAllocations.filter((a) => new Date(a.toDate) < today);

      for (const allocation of expired) {
        await allocationRepository.endAllocation(allocation._id, allocation.toDate);
        expiredCount++;

        // Recalculate employee utilisation
        const empId = allocation.employeeId._id || allocation.employeeId;
        await this._recalculateUtilisation(empId, today);
      }

      console.log(`     Processed ${expiredCount} expired allocations.`);
    } catch (err) {
      console.error('     Error in Allocation Expiry Job:', err.message);
    }
  }

  /**
   * Job 2: Process Missed Timesheets
   * @private
   */
  async _processMissedTimesheets() {
    console.log('  -> Running Missed Timesheet Job...');
    let missedCount = 0;

    try {
      const lastWeekStart = getLastCompletedWeekStart();
      
      // Get all active employees
      const employees = await employeeRepository.findAll({ isActive: true });

      for (const employee of employees) {
        const empId = employee._id;

        // Check if timesheet exists for last week
        const exists = await timesheetRepository.exists(empId, lastWeekStart);

        if (!exists) {
          await timesheetRepository.insertMissed(empId, lastWeekStart);
          missedCount++;
        }
      }

      console.log(`     Processed ${missedCount} missed timesheets for week starting ${lastWeekStart.toLocaleDateString()}.`);
    } catch (err) {
      console.error('     Error in Missed Timesheet Job:', err.message);
    }
  }

  /**
   * Recalculate an employee's current utilisation from active allocations.
   * Duplicate logic from AllocationService to prevent circular dependency.
   * @private
   */
  async _recalculateUtilisation(employeeId, today) {
    const activeAllocations = await allocationRepository.findActiveByEmployeeOnDate(
      employeeId, today
    );

    const totalUtil = activeAllocations.reduce((sum, a) => sum + a.utilisation, 0);
    const status = totalUtil > 0 ? 'ALLOCATED' : 'BENCH';

    await employeeRepository.update(employeeId, {
      currentUtilisation: totalUtil,
      status,
    });
  }
}

module.exports = new SchedulerService();
