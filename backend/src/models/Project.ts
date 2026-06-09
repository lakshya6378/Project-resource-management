import mongoose from 'mongoose';
import { PROJECT_STATUS, HEALTH_STATUS, MILESTONE_STATUS } from '../config/constants';

/**
 * Milestone Sub-document Schema
 *
 * Embedded within Project. Each milestone has a title, due date, and status.
 * Status is updated by Admin. Overdue milestones (IN_PROGRESS past dueDate)
 * are flagged by the background scheduler for health computation.
 */
const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(MILESTONE_STATUS),
        message: 'Status must be one of: NOT_STARTED, IN_PROGRESS, DONE, AT_RISK',
      },
      default: MILESTONE_STATUS.NOT_STARTED,
    },
  },
  {
    _id: true, // Each milestone gets its own _id for individual updates
  }
);

/**
 * Project Schema
 *
 * Represents a project managed by a delivery manager.
 * Contains embedded milestones and a health status computed by the scheduler.
 *
 * Health status is determined by:
 *   - Overdue milestones (IN_PROGRESS past dueDate)
 *   - Low hours logged by allocated resources vs expected hours
 *
 * Health transitions:
 *   ON_TRACK → ATTENTION (one risk factor)
 *   ATTENTION → AT_RISK (multiple risk factors)
 */
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Manager ID is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(PROJECT_STATUS),
        message: 'Status must be one of: PLANNED, ACTIVE, ON_HOLD, COMPLETED',
      },
      default: PROJECT_STATUS.PLANNED,
    },
    healthStatus: {
      type: String,
      enum: {
        values: Object.values(HEALTH_STATUS),
        message: 'Health status must be one of: ON_TRACK, ATTENTION, AT_RISK',
      },
      default: HEALTH_STATUS.ON_TRACK,
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
projectSchema.index({ managerId: 1, status: 1 }); // Manager's project list

// ─── Validation: startDate must be before endDate ─────────────
projectSchema.pre('validate', function () {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
});

// ─── Transform: Clean JSON output ────────────────────────────
projectSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Project', projectSchema);
