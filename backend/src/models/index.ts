/**
 * Models barrel export.
 * Centralizes all Mongoose model imports for clean access.
 *
 * Usage:
 *   import { User, Employee, Project } from '../models';
 */

import User from './User';
import Employee from './Employee';
import Project from './Project';
import Allocation from './Allocation';
import Timesheet from './Timesheet';
import SystemConfig from './SystemConfig';

export {
  User,
  Employee,
  Project,
  Allocation,
  Timesheet,
  SystemConfig,
};
