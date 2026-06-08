const inquirer = require('inquirer');
const api = require('../apiClient');
const ui = require('../ui');

/**
 * Admin Employee Management Screens
 */

const employeeMenu = async () => {
  ui.header('Admin — Employee Management');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an action:',
      choices: [
        { name: '📋 List all employees', value: 'list' },
        { name: '➕ Create employee profile', value: 'create' },
        { name: '👤 View employee detail', value: 'detail' },
        { name: '✏️  Update employee', value: 'update' },
        { name: '🛠️  Manage skills', value: 'skills' },
        { name: '🔒 Deactivate employee', value: 'deactivate' },
        new inquirer.Separator(),
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  switch (action) {
    case 'list':
      await listEmployeesScreen();
      break;
    case 'create':
      await createEmployeeScreen();
      break;
    case 'detail':
      await employeeDetailScreen();
      break;
    case 'update':
      await updateEmployeeScreen();
      break;
    case 'skills':
      await skillsMenu();
      break;
    case 'deactivate':
      await deactivateEmployeeScreen();
      break;
    case 'back':
      return;
  }

  return employeeMenu();
};

const listEmployeesScreen = async () => {
  try {
    const { filterStatus } = await inquirer.prompt([
      {
        type: 'list',
        name: 'filterStatus',
        message: 'Filter by status:',
        choices: [
          { name: 'All active', value: '' },
          { name: 'BENCH only', value: 'BENCH' },
          { name: 'ALLOCATED only', value: 'ALLOCATED' },
        ],
      },
    ]);

    const params = {};
    if (filterStatus) params.status = filterStatus;

    const result = await api.listEmployees(params);
    const { employees, counts } = result.data;

    ui.header('Employees');
    ui.info(`Total: ${counts.total} | Allocated: ${counts.allocated} | Bench: ${counts.bench}`);

    ui.table(
      employees.map((e) => ({
        name: e.fullName,
        department: e.department,
        designation: e.designation,
        status: e.status,
        utilisation: `${e.currentUtilisation}%`,
        skills: e.skills.length,
        id: e._id,
      })),
      ['name', 'department', 'designation', 'status', 'utilisation', 'skills', 'id'],
      {
        name: 'Name', department: 'Dept', designation: 'Designation',
        status: 'Status', utilisation: 'Util%', skills: '#Skills', id: 'ID',
      }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const createEmployeeScreen = async () => {
  ui.header('Create Employee Profile');

  try {
    // Fetch users to select from
    const usersResult = await api.listUsers();
    const availableUsers = usersResult.data.users.filter(
      (u) => u.role !== 'ADMIN' && u.isActive
    );

    if (availableUsers.length === 0) {
      ui.warn('No eligible user accounts. Create a MANAGER or EMPLOYEE user first.');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'userId',
        message: 'Select user account to link:',
        choices: availableUsers.map((u) => ({
          name: `${u.fullName} (${u.username}) — ${u.role}`,
          value: u._id,
        })),
      },
      {
        type: 'input',
        name: 'fullName',
        message: 'Full name:',
        validate: (val) => val.length >= 2 || 'Min 2 characters',
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: (val) => /^\S+@\S+\.\S+$/.test(val) || 'Invalid email',
      },
      {
        type: 'input',
        name: 'department',
        message: 'Department:',
        validate: (val) => val.length > 0 || 'Required',
      },
      {
        type: 'input',
        name: 'designation',
        message: 'Designation:',
        validate: (val) => val.length > 0 || 'Required',
      },
    ]);

    const result = await api.createEmployee(answers);
    ui.success(`Employee profile created (ID: ${result.data._id})`);
  } catch (err) {
    ui.error(err.message);
  }
};

const employeeDetailScreen = async () => {
  try {
    const employee = await selectEmployee('Select employee to view:');
    if (!employee) return;

    const result = await api.getEmployee(employee._id);
    const emp = result.data;

    ui.header(`Employee: ${emp.fullName}`);
    ui.detail(emp, [
      { key: '_id', label: 'ID' },
      { key: 'fullName', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status' },
      { key: 'currentUtilisation', label: 'Utilisation' },
    ]);

    if (emp.skills.length > 0) {
      console.log('');
      ui.info('Skills:');
      ui.table(
        emp.skills.map((s) => ({
          name: s.name,
          category: s.category,
          proficiency: s.proficiency,
          id: s._id,
        })),
        ['name', 'category', 'proficiency', 'id'],
        { name: 'Skill', category: 'Category', proficiency: 'Level', id: 'Skill ID' }
      );
    } else {
      ui.info('No skills added yet');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

const updateEmployeeScreen = async () => {
  try {
    const employee = await selectEmployee('Select employee to update:');
    if (!employee) return;

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'fullName',
        message: `Full name (${employee.fullName}):`,
        default: employee.fullName,
      },
      {
        type: 'input',
        name: 'department',
        message: `Department (${employee.department}):`,
        default: employee.department,
      },
      {
        type: 'input',
        name: 'designation',
        message: `Designation (${employee.designation}):`,
        default: employee.designation,
      },
    ]);

    await api.updateEmployee(employee._id, answers);
    ui.success('Employee updated');
  } catch (err) {
    ui.error(err.message);
  }
};

const deactivateEmployeeScreen = async () => {
  try {
    const employee = await selectEmployee('Select employee to deactivate:');
    if (!employee) return;

    ui.warn(`This will end all allocations and deactivate the user account for ${employee.fullName}`);
    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: 'Are you sure?', default: false },
    ]);

    if (confirm) {
      await api.deactivateEmployee(employee._id);
      ui.success('Employee deactivated');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Skills Management ──────────────────────────────────────

const skillsMenu = async () => {
  const employee = await selectEmployee('Select employee for skills management:');
  if (!employee) return;

  const runSkillsMenu = async () => {
    ui.header(`Skills — ${employee.fullName}`);

    // Show current skills
    const skillsResult = await api.getSkills(employee._id);
    const skills = skillsResult.data;

    if (skills.length > 0) {
      ui.table(
        skills.map((s) => ({ name: s.name, category: s.category, proficiency: s.proficiency, id: s._id })),
        ['name', 'category', 'proficiency', 'id'],
        { name: 'Skill', category: 'Category', proficiency: 'Level', id: 'ID' }
      );
    } else {
      ui.info('No skills yet');
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [
          { name: '➕ Add skill', value: 'add' },
          { name: '✏️  Update proficiency', value: 'update' },
          { name: '🗑️  Remove skill', value: 'remove' },
          new inquirer.Separator(),
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'back') return;

    if (action === 'add') {
      const skill = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Skill name:', validate: (v) => v.length > 0 || 'Required' },
        { type: 'list', name: 'category', message: 'Category:', choices: ['Backend', 'Frontend', 'DevOps', 'QA', 'Other'] },
        { type: 'list', name: 'proficiency', message: 'Proficiency:', choices: ['Beginner', 'Intermediate', 'Advanced'] },
      ]);
      try {
        await api.addSkill(employee._id, skill);
        ui.success(`Skill '${skill.name}' added`);
      } catch (err) {
        ui.error(err.message);
      }
    }

    if (action === 'update' && skills.length > 0) {
      const { skillId } = await inquirer.prompt([
        {
          type: 'list', name: 'skillId', message: 'Select skill:',
          choices: skills.map((s) => ({ name: `${s.name} (${s.proficiency})`, value: s._id })),
        },
      ]);
      const { proficiency } = await inquirer.prompt([
        { type: 'list', name: 'proficiency', message: 'New proficiency:', choices: ['Beginner', 'Intermediate', 'Advanced'] },
      ]);
      try {
        await api.updateSkillProficiency(employee._id, skillId, proficiency);
        ui.success('Proficiency updated');
      } catch (err) {
        ui.error(err.message);
      }
    }

    if (action === 'remove' && skills.length > 0) {
      const { skillId } = await inquirer.prompt([
        {
          type: 'list', name: 'skillId', message: 'Select skill to remove:',
          choices: skills.map((s) => ({ name: s.name, value: s._id })),
        },
      ]);
      try {
        await api.removeSkill(employee._id, skillId);
        ui.success('Skill removed');
      } catch (err) {
        ui.error(err.message);
      }
    }

    return runSkillsMenu();
  };

  return runSkillsMenu();
};

// ─── Helper: Employee picker ─────────────────────────────────

const selectEmployee = async (message) => {
  const result = await api.listEmployees();
  const employees = result.data.employees;

  if (employees.length === 0) {
    ui.info('No employees found');
    return null;
  }

  const { empId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'empId',
      message,
      choices: employees.map((e) => ({
        name: `${e.fullName} — ${e.department} (${e.status})`,
        value: e._id,
      })),
    },
  ]);

  return employees.find((e) => e._id === empId);
};

module.exports = { employeeMenu };
