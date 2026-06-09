import mongoose from 'mongoose';
import {
  EMPLOYEE_STATUS,
  SKILL_CATEGORIES,
  PROFICIENCY_LEVELS,
} from '../config/constants';

/**
 * Skill Sub-document Schema
 *
 * Embedded within Employee. Each skill has a name, category, and proficiency.
 * Category is selected from a fixed list at the time of adding.
 * Proficiency can be updated independently.
 */
const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: Object.values(SKILL_CATEGORIES),
        message: 'Category must be one of: Backend, Frontend, DevOps, QA, Other',
      },
      required: [true, 'Skill category is required'],
    },
    proficiency: {
      type: String,
      enum: {
        values: Object.values(PROFICIENCY_LEVELS),
        message: 'Proficiency must be one of: Beginner, Intermediate, Advanced',
      },
      required: [true, 'Proficiency level is required'],
    },
  },
  {
    _id: true, // Each skill gets its own _id for update/delete operations
  }
);

/**
 * Employee Schema
 *
 * Represents the work profile of a person. Linked to a User account
 * via userId. Tracks department, designation, skills, and current
 * utilisation (computed by the background scheduler).
 *
 * Status transitions:
 *   BENCH → ALLOCATED (when allocated to a project)
 *   ALLOCATED → BENCH (when all allocations end)
 *   BENCH/ALLOCATED → INACTIVE (when deactivated by admin)
 */
const employeeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(EMPLOYEE_STATUS),
        message: 'Status must be one of: BENCH, ALLOCATED, INACTIVE',
      },
      default: EMPLOYEE_STATUS.BENCH,
    },
    currentUtilisation: {
      type: Number,
      default: 0,
      min: [0, 'Utilisation cannot be negative'],
      max: [100, 'Utilisation cannot exceed 100%'],
    },
    skills: {
      type: [skillSchema],
      default: [],
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

// ─── Indexes ──────────────────────────────────────────────────
// userId unique index is created by `unique: true` in the schema field above
employeeSchema.index({ status: 1, department: 1 }); // Resource Dashboard filter

// ─── Transform: Clean JSON output ────────────────────────────
employeeSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Employee', employeeSchema);
