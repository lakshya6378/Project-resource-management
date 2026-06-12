import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
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
} from '../src/models';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prm';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB. Wiping database...');

    // Drop all collections
    await mongoose.connection.db.dropDatabase();
    console.log('Database wiped.');

    // 1. Create Permissions
    console.log('Creating Permissions...');
    const permissions = await Permission.insertMany([
      { code: 'MANAGE_USERS', description: 'Create, update, and deactivate users' },
      { code: 'MANAGE_SYSTEM', description: 'Modify system config and trigger scheduler' },
      { code: 'MANAGE_PROJECTS_ALL', description: 'Create and update any project' },
      { code: 'MANAGE_EMPLOYEES', description: 'Assign managers, update profiles' },
      { code: 'VIEW_ALLOCATIONS_ALL', description: 'View all allocations across the company' },
      { code: 'MANAGE_TEAM_ALLOCATIONS', description: 'Allocate resources directly reporting to manager' },
      { code: 'VIEW_TEAM_DASHBOARD', description: 'View resource dashboard for reporting team' },
      { code: 'SUBMIT_TIMESHEET', description: 'Submit weekly timesheets for own allocations' },
      { code: 'MANAGE_SKILLS', description: 'Manage global skill categories and skills' },
      { code: 'VIEW_PROJECTS', description: 'View projects' },
      { code: 'REVIEW_TIMESHEETS', description: 'Review team timesheets' },
    ]);

    const getPerm = (code: string) => permissions.find((p) => p.code === code)!._id;

    // 2. Create Roles
    console.log('Creating Roles...');
    const adminRole = await Role.create({ name: 'ADMIN', description: 'Full system config, Users, Skills, Projects' });
    const managerRole = await Role.create({ name: 'MANAGER', description: 'Manage Team Allocations, View Projects' });
    const employeeRole = await Role.create({ name: 'EMPLOYEE', description: 'View own allocations, Submit Timesheet' });

    // 3. Map Permissions to Roles
    console.log('Mapping RolePermissions...');
    const rolePerms = [
      // Admin gets everything except submit timesheet
      { roleId: adminRole._id, permissionId: getPerm('MANAGE_USERS') },
      { roleId: adminRole._id, permissionId: getPerm('MANAGE_SYSTEM') },
      { roleId: adminRole._id, permissionId: getPerm('MANAGE_PROJECTS_ALL') },
      { roleId: adminRole._id, permissionId: getPerm('MANAGE_EMPLOYEES') },
      { roleId: adminRole._id, permissionId: getPerm('VIEW_ALLOCATIONS_ALL') },
      { roleId: adminRole._id, permissionId: getPerm('MANAGE_SKILLS') },
      
      // Manager
      { roleId: managerRole._id, permissionId: getPerm('MANAGE_TEAM_ALLOCATIONS') },
      { roleId: managerRole._id, permissionId: getPerm('VIEW_TEAM_DASHBOARD') },
      { roleId: managerRole._id, permissionId: getPerm('SUBMIT_TIMESHEET') },
      { roleId: managerRole._id, permissionId: getPerm('VIEW_PROJECTS') },
      { roleId: managerRole._id, permissionId: getPerm('REVIEW_TIMESHEETS') },
      
      // Employee
      { roleId: employeeRole._id, permissionId: getPerm('SUBMIT_TIMESHEET') },
    ];
    await RolePermission.insertMany(rolePerms);

    // 4. Create Users
    console.log('Creating Users...');

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      fullName: 'System Admin',
      passwordHash: 'Admin@1234',
      roleId: adminRole._id,
      forcePasswordChange: true,
    });

    const managerUser = await User.create({
      username: 'manager1',
      email: 'manager@example.com',
      fullName: 'Alice Manager',
      passwordHash: 'Admin@1234',
      roleId: managerRole._id,
      forcePasswordChange: true,
    });

    const employeeUser = await User.create({
      username: 'emp1',
      email: 'emp1@example.com',
      fullName: 'Bob Employee',
      passwordHash: 'Admin@1234',
      roleId: employeeRole._id,
      forcePasswordChange: true,
    });

    // 5. Create Departments & Designations
    console.log('Creating HR Profiles...');
    const engineeringDept = await Department.create({ name: 'Engineering' });
    const softwareEngDesignation = await Designation.create({ title: 'Software Engineer', departmentId: engineeringDept._id });
    const emDesignation = await Designation.create({ title: 'Engineering Manager', departmentId: engineeringDept._id });
    const adminDept = await Department.create({ name: 'Administrator' });
    const adminDesig = await Designation.create({ title: 'HR', departmentId: adminDept._id });

    // 6. Create Employee Profiles
    const adminProfile = new EmployeeProfile({
      _id: adminUser._id,
      fullName: adminUser.fullName,
      departmentId: adminDept._id,
      designationId: adminDesig._id,
    });
    await adminProfile.save();

    const managerProfile = new EmployeeProfile({
      _id: managerUser._id,
      fullName: managerUser.fullName,
      departmentId: engineeringDept._id,
      designationId: emDesignation._id,
    });
    await managerProfile.save();

    const employeeProfile = new EmployeeProfile({
      _id: employeeUser._id,
      fullName: employeeUser.fullName,
      departmentId: engineeringDept._id,
      designationId: softwareEngDesignation._id,
    });
    await employeeProfile.save();

    // 7. Create Resource Profiles
    // Only EMPLOYEE roles get a ResourceProfile
    const employeeResource = new ResourceProfile({
      _id: employeeUser._id,
      managerId: managerUser._id, // Bob reports to Alice
      status: 'BENCH',
      currentUtilisation: 0,
    });
    await employeeResource.save();

    // 8. Create Skills
    console.log('Creating Skills...');
    const catBackend = await SkillCategory.create({ name: 'Backend' });
    const catFrontend = await SkillCategory.create({ name: 'Frontend' });
    const catDevops = await SkillCategory.create({ name: 'DevOps' });
    const catQA = await SkillCategory.create({ name: 'QA' });
    const catOther = await SkillCategory.create({ name: 'Other' });

    const tsSkill = await Skill.create({ name: 'TypeScript', categoryId: catFrontend._id });
    const nodeSkill = await Skill.create({ name: 'Node.js', categoryId: catBackend._id });
    const reactSkill = await Skill.create({ name: 'React', categoryId: catFrontend._id });
    const dockerSkill = await Skill.create({ name: 'Docker', categoryId: catDevops._id });

    await EmployeeSkill.create({ resourceId: employeeUser._id, skillId: tsSkill._id, proficiency: 'EXPERT' });
    await EmployeeSkill.create({ resourceId: employeeUser._id, skillId: reactSkill._id, proficiency: 'INTERMEDIATE' });

    console.log('--- Seeding Complete ---');
    console.log('Admin credentials: admin / Admin@1234');
    console.log('Manager credentials: manager1 / Admin@1234');
    console.log('Employee credentials: emp1 / Admin@1234');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
