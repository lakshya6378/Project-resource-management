/**
 * Repositories barrel export.
 *
 * Repository Pattern: all database operations are encapsulated here.
 * Services and controllers import repositories from this single entry point.
 * This enables Dependency Inversion — business logic depends on
 * repository interfaces, not on Mongoose directly.
 *
 * Usage:
 *   const { userRepository, employeeRepository } = require('../repositories');
 */

const userRepository = require('./UserRepository');
const employeeRepository = require('./EmployeeRepository');
const projectRepository = require('./ProjectRepository');
const allocationRepository = require('./AllocationRepository');
const timesheetRepository = require('./TimesheetRepository');
const systemConfigRepository = require('./SystemConfigRepository');

module.exports = {
  userRepository,
  employeeRepository,
  projectRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
};
