/**
 * Repositories barrel export.
 *
 * Repository Pattern: all database operations are encapsulated here.
 * Services and controllers import repositories from this single entry point.
 * This enables Dependency Inversion — business logic depends on
 * repository interfaces, not on Mongoose directly.
 *
 * Usage:
 *   import { userRepository, employeeRepository } from '../repositories';
 */

import userRepository from './UserRepository';
import employeeRepository from './EmployeeRepository';
import projectRepository from './ProjectRepository';
import allocationRepository from './AllocationRepository';
import timesheetRepository from './TimesheetRepository';
import systemConfigRepository from './SystemConfigRepository';

export {
  userRepository,
  employeeRepository,
  projectRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
};
