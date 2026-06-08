const mongoose = require('mongoose');

/**
 * Allocation Schema
 *
 * Represents an employee's assignment to a project for a specific
 * period and utilisation percentage. The core entity for resource management.
 *
 * Validation rules (enforced by AllocationService, not at schema level):
 *   - Total utilisation across overlapping allocations ≤ 100%
 *   - fromDate must be before toDate
 *   - Project must be ACTIVE or PLANNED
 *   - Only the project's assigned manager can create/end allocations
 *
 * Lifecycle:
 *   Created (isActive=true) → Ended manually (isActive=false, toDate=today)
 *                            → Expired naturally (toDate passes, scheduler updates)
 *                            → Force-ended (employee deactivation)
 */
const allocationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Manager ID is required'],
    },
    utilisation: {
      type: Number,
      required: [true, 'Utilisation percentage is required'],
      min: [1, 'Utilisation must be at least 1%'],
      max: [100, 'Utilisation cannot exceed 100%'],
    },
    fromDate: {
      type: Date,
      required: [true, 'From date is required'],
    },
    toDate: {
      type: Date,
      required: [true, 'To date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound Indexes (Performance Critical) ──────────────────
// Overlap check: find all active allocations for an employee in a date range
allocationSchema.index({ employeeId: 1, fromDate: 1, toDate: 1, isActive: 1 });
// Project team view: find all active allocations for a project
allocationSchema.index({ projectId: 1, isActive: 1 });

// ─── Validation: fromDate must be before toDate ───────────────
allocationSchema.pre('validate', function () {
  if (this.fromDate && this.toDate && this.fromDate >= this.toDate) {
    this.invalidate('toDate', 'To date must be after from date');
  }
});

// ─── Transform: Clean JSON output ────────────────────────────
allocationSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Allocation', allocationSchema);
