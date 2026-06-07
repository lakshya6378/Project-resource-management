/**
 * Models barrel export.
 * Centralizes all Mongoose model imports for clean access.
 *
 * Usage:
 *   const { User, Employee, Project } = require('../models');
 */

const User = require('./User');
const Employee = require('./Employee');
const Project = require('./Project');
const Allocation = require('./Allocation');
const Timesheet = require('./Timesheet');
const SystemConfig = require('./SystemConfig');

module.exports = {
  User,
  Employee,
  Project,
  Allocation,
  Timesheet,
  SystemConfig,
};
