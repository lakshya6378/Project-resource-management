import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  User,
  Role,
  Permission,
  RolePermission,
  Department,
  Designation,
  EmployeeProfile,
  SkillCategory,
  Skill,
} from '../src/models';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prm';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB. Seeding database...');

    // 1. Create Permissions
    console.log('Checking Permissions...');
    const permissionData = [
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
    ];

    for (const p of permissionData) {
      const exists = await Permission.findOne({ code: p.code });
      if (!exists) {
        await Permission.create(p);
      }
    }
    const permissions = await Permission.find();
    const getPerm = (code: string) => permissions.find((p) => p.code === code)!._id;

    // 2. Create Roles
    console.log('Checking Roles...');
    const roleData = [
      { name: 'ADMIN', description: 'Full system config, Users, Skills, Projects' },
      { name: 'MANAGER', description: 'Manage Team Allocations, View Projects' },
      { name: 'EMPLOYEE', description: 'View own allocations, Submit Timesheet' }
    ];

    for (const r of roleData) {
      const exists = await Role.findOne({ name: r.name });
      if (!exists) {
        await Role.create(r);
      }
    }
    
    const adminRole = await Role.findOne({ name: 'ADMIN' });
    const managerRole = await Role.findOne({ name: 'MANAGER' });
    const employeeRole = await Role.findOne({ name: 'EMPLOYEE' });

    // 3. Map Permissions to Roles
    console.log('Checking RolePermissions...');
    const rolePerms = [
      // Admin gets everything except submit timesheet
      { roleId: adminRole!._id, permissionId: getPerm('MANAGE_USERS') },
      { roleId: adminRole!._id, permissionId: getPerm('MANAGE_SYSTEM') },
      { roleId: adminRole!._id, permissionId: getPerm('MANAGE_PROJECTS_ALL') },
      { roleId: adminRole!._id, permissionId: getPerm('MANAGE_EMPLOYEES') },
      { roleId: adminRole!._id, permissionId: getPerm('VIEW_ALLOCATIONS_ALL') },
      { roleId: adminRole!._id, permissionId: getPerm('MANAGE_SKILLS') },
      
      // Manager
      { roleId: managerRole!._id, permissionId: getPerm('MANAGE_TEAM_ALLOCATIONS') },
      { roleId: managerRole!._id, permissionId: getPerm('VIEW_TEAM_DASHBOARD') },
      { roleId: managerRole!._id, permissionId: getPerm('SUBMIT_TIMESHEET') },
      { roleId: managerRole!._id, permissionId: getPerm('VIEW_PROJECTS') },
      { roleId: managerRole!._id, permissionId: getPerm('REVIEW_TIMESHEETS') },
      
      // Employee
      { roleId: employeeRole!._id, permissionId: getPerm('SUBMIT_TIMESHEET') },
    ];

    for (const rp of rolePerms) {
      const exists = await RolePermission.findOne({ roleId: rp.roleId, permissionId: rp.permissionId });
      if (!exists) {
        await RolePermission.create(rp);
      }
    }

    // 4. Create Admin User (if not exists)
    console.log('Checking Admin User...');
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        fullName: 'System Admin',
        passwordHash: 'Admin@1234',
        roleId: adminRole!._id,
        forcePasswordChange: true,
      });
      console.log('Created Admin User.');
    }

    // 5. Create Departments & Designations for Admin
    console.log('Checking Admin HR Profile...');
    let adminDept = await Department.findOne({ name: 'Administrator' });
    if (!adminDept) {
      adminDept = await Department.create({ name: 'Administrator' });
    }

    let adminDesig = await Designation.findOne({ title: 'HR', departmentId: adminDept._id });
    if (!adminDesig) {
      adminDesig = await Designation.create({ title: 'HR', departmentId: adminDept._id });
    }

    // 6. Create Admin Employee Profile
    let adminProfile = await EmployeeProfile.findById(adminUser._id);
    if (!adminProfile) {
      await EmployeeProfile.create({
        _id: adminUser._id,
        fullName: adminUser.fullName,
        departmentId: adminDept._id,
        designationId: adminDesig._id,
      });
    }

    // 7. Create Skills
    console.log('Checking basic Skills...');
    const skillCategories = ['Backend', 'Frontend', 'DevOps', 'QA', 'Other'];
    for (const catName of skillCategories) {
      const exists = await SkillCategory.findOne({ name: catName });
      if (!exists) {
        await SkillCategory.create({ name: catName });
      }
    }

    console.log('--- Seeding Complete ---');
    console.log('Admin credentials (if newly created): admin / Admin@1234');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
