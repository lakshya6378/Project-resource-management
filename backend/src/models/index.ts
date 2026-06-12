/**
 * Models barrel export.
 * Centralizes all Mongoose model imports for clean access.
 *
 * Usage:
 *   import { User, Employee, Project } from '../models';
 */

import User from './User';
import Role from './Role';
import Permission from './Permission';
import RolePermission from './RolePermission';
import Department from './Department';
import Designation from './Designation';
import EmployeeProfile from './EmployeeProfile';
import ResourceProfile from './ResourceProfile';
import SkillCategory from './SkillCategory';
import Skill from './Skill';
import EmployeeSkill from './EmployeeSkill';
import Project from './Project';
import Allocation from './Allocation';
import Timesheet from './Timesheet';
import SystemConfig from './SystemConfig';

export {
  User,
  Role,
  Permission,
  RolePermission,
  Department,
  Designation,
  EmployeeProfile,
  ResourceProfile,
  SkillCategory,
  Skill,
  EmployeeSkill,
  Project,
  Allocation,
  Timesheet,
  SystemConfig,
};
