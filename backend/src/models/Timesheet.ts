import mongoose from 'mongoose';
import { TIMESHEET_STATUS } from '../config/constants';

/**
 * Timesheet Entry Sub-document Schema
 *
 * Each entry represents hours logged on a specific project for the week.
 * Activity tags capture what type of work was done — this data powers
 * the AI Skill Matcher by providing real evidence of skill usage.
 */
const timesheetEntrySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    hours: {
      type: Number,
      required: [true, 'Hours are required'],
      min: [0, 'Hours cannot be negative'],
    },
    activityTags: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false, // Entries don't need individual IDs
  }
);

/**
 * Timesheet Schema
 *
 * Represents a weekly timesheet submission by an employee.
 * weekStart is always normalized to Monday (server-side).
 *
 * Status:
 *   SUBMITTED — Employee filled and submitted the timesheet
 *   MISSED — Auto-inserted by scheduler when employee didn't submit
 *
 * Validation rules (enforced by TimesheetService):
 *   - No future week submissions
 *   - No duplicate submissions for same {employeeId, weekStart}
 *   - Hours per project ≤ (allocation% × maxWeeklyHours)
 *   - Total hours ≤ maxWeeklyHours
 *   - Can only log hours for projects the employee is allocated to
 */
const timesheetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
    },
    weekStart: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TIMESHEET_STATUS),
        message: 'Status must be one of: SUBMITTED, MISSED',
      },
      default: TIMESHEET_STATUS.SUBMITTED,
    },
    totalHours: {
      type: Number,
      default: 0,
      min: [0, 'Total hours cannot be negative'],
    },
    entries: {
      type: [timesheetEntrySchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    accessRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      status: {
        type: String,
        enum: Object.values(require('../config/constants').ACCESS_STATUS),
        default: 'NONE',
      },
      requestedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// ─── Unique Compound Index: One timesheet per employee per week ─
timesheetSchema.index({ employeeId: 1, weekStart: 1 }, { unique: true });

// ─── Transform: Clean JSON output ────────────────────────────
timesheetSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Timesheet', timesheetSchema);
