import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Role, Department, Designation, SkillCategory, Skill, ResourceProfile, EmployeeProfile, Project } from './models';
import { ROLES, PROJECT_STATUS } from './config/constants';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prm_tool';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB for Seeding...');

    // 1. Roles
    const roleManager = await Role.findOne({ name: ROLES.MANAGER }) || await Role.create({ name: ROLES.MANAGER });
    const roleEmployee = await Role.findOne({ name: ROLES.EMPLOYEE }) || await Role.create({ name: ROLES.EMPLOYEE });
    const roleAdmin = await Role.findOne({ name: ROLES.ADMIN }) || await Role.create({ name: ROLES.ADMIN });

    // 2. Departments & Designations
    const deptEngineering = await Department.findOne({ name: 'Engineering' }) || await Department.create({ name: 'Engineering' });
    const deptDesign = await Department.findOne({ name: 'Design' }) || await Department.create({ name: 'Design' });

    const desigSDE1 = await Designation.findOne({ title: 'SDE 1' }) || await Designation.create({ title: 'SDE 1', departmentId: deptEngineering._id });
    const desigSDE2 = await Designation.findOne({ title: 'SDE 2' }) || await Designation.create({ title: 'SDE 2', departmentId: deptEngineering._id });
    const desigUI = await Designation.findOne({ title: 'UI Designer' }) || await Designation.create({ title: 'UI Designer', departmentId: deptDesign._id });

    // 3. Skill Categories & Skills
    const catFrontend = await SkillCategory.findOne({ name: 'Frontend' }) || await SkillCategory.create({ name: 'Frontend', description: 'UI development' });
    const catBackend = await SkillCategory.findOne({ name: 'Backend' }) || await SkillCategory.create({ name: 'Backend', description: 'Server development' });

    await Skill.findOne({ name: 'React' }) || await Skill.create({ name: 'React', categoryId: catFrontend._id });
    await Skill.findOne({ name: 'Angular' }) || await Skill.create({ name: 'Angular', categoryId: catFrontend._id });
    await Skill.findOne({ name: 'Node.js' }) || await Skill.create({ name: 'Node.js', categoryId: catBackend._id });
    await Skill.findOne({ name: 'Python' }) || await Skill.create({ name: 'Python', categoryId: catBackend._id });

    const defaultPassword = await bcrypt.hash('Password123!', 10);

    // 4. Managers
    const managers = [];
    for (let i = 1; i <= 3; i++) {
      const username = `seedmanager${i}`;
      let user = await User.findOne({ username });
      if (!user) {
        user = await User.create({
          username,
          email: `${username}@test.com`,
          fullName: `Seed Manager ${i}`,
          passwordHash: defaultPassword,
          roleId: roleManager._id,
          isActive: true,
          forcePasswordChange: false
        });
        console.log(`Created Manager: ${username}`);
      }
      managers.push(user);
    }

    // 5. 10 Sequential Employee Users
    for (let i = 1; i <= 10; i++) {
      const username = `seeduser${i}`;
      let user = await User.findOne({ username });
      if (!user) {
        user = await User.create({
          username,
          email: `${username}@test.com`,
          fullName: `Seed Employee ${i}`,
          passwordHash: defaultPassword,
          roleId: roleEmployee._id,
          isActive: true,
          forcePasswordChange: false
        });
        
        // Create Employee Profile
        const isDesign = i % 3 === 0;
        await EmployeeProfile.create({
          _id: user._id,
          fullName: user.fullName,
          departmentId: isDesign ? deptDesign._id : deptEngineering._id,
          designationId: isDesign ? desigUI._id : (i % 2 === 0 ? desigSDE2._id : desigSDE1._id)
        });

        // Create Resource Profile
        await ResourceProfile.create({
          _id: user._id,
          status: 'BENCH',
          currentUtilisation: 0,
          managerId: managers[i % managers.length]._id
        });

        console.log(`Created Employee Resource: ${username}`);
      }
    }

    // 6. Dummy Projects
    for (let i = 1; i <= 5; i++) {
      const projName = `Seed Project Alpha ${i}`;
      const existingProj = await Project.findOne({ name: projName });
      if (!existingProj) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6);
        
        await Project.create({
          name: projName,
          description: `This is dummy project ${i}`,
          managerId: managers[i % managers.length]._id,
          status: PROJECT_STATUS.PLANNED,
          startDate,
          endDate,
          totalStoryPoints: 500 * i
        });
        console.log(`Created Project: ${projName}`);
      }
    }

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
