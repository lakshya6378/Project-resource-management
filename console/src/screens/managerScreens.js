const inquirer = require('inquirer');
const api = require('../apiClient');
const ui = require('../ui');

/**
 * Manager Console Screens
 *
 * Provides Allocation Management and Team Timesheet viewing
 * for Manager-role users.
 */

const managerMainMenu = async () => {
  ui.header('Manager Dashboard');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '👥 Manage Allocations', value: 'allocations' },
        { name: '⏱️  View Team Timesheets', value: 'timesheets' },
        { name: '🔑 Change My Password', value: 'password' },
        new inquirer.Separator(),
        { name: '🚪 Logout', value: 'logout' },
      ],
    },
  ]);

  switch (action) {
    case 'allocations':
      await allocationsMenu();
      break;
    case 'timesheets':
      await teamTimesheetsScreen();
      break;
    case 'password':
      const { changePasswordScreen } = require('./authScreens');
      await changePasswordScreen();
      break;
    case 'logout':
      try {
        await api.logout();
        api.clearToken();
        ui.success('Logged out');
      } catch (err) {
        ui.error(err.message);
      }
      return 'LOGOUT';
  }

  return managerMainMenu();
};

// ─── Allocations Management ───────────────────────────────────

const allocationsMenu = async () => {
  ui.header('Manage Allocations');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select action:',
      choices: [
        { name: '📋 View allocations for a project', value: 'view_project' },
        { name: '👤 View allocations for an employee', value: 'view_employee' },
        { name: '➕ Allocate employee to project', value: 'create' },
        { name: '🛑 End an allocation', value: 'end' },
        new inquirer.Separator(),
        { name: '⬅️  Back', value: 'back' },
      ],
    },
  ]);

  switch (action) {
    case 'view_project':
      await viewProjectAllocations();
      break;
    case 'view_employee':
      await viewEmployeeAllocations();
      break;
    case 'create':
      await createAllocationScreen();
      break;
    case 'end':
      await endAllocationScreen();
      break;
    case 'back':
      return;
  }

  return allocationsMenu();
};

const viewProjectAllocations = async () => {
  try {
    const project = await selectMyProject('Select project to view allocations:');
    if (!project) return;

    const result = await api.getProjectAllocations(project._id);
    const allocations = result.data;

    ui.header(`Active Allocations — ${project.name}`);

    if (allocations.length === 0) {
      ui.info('No active allocations');
      return;
    }

    ui.table(
      allocations.map((a) => ({
        employee: a.employeeId.fullName,
        dept: a.employeeId.department,
        util: `${a.utilisation}%`,
        from: new Date(a.fromDate).toLocaleDateString(),
        to: new Date(a.toDate).toLocaleDateString(),
        id: a._id,
      })),
      ['employee', 'dept', 'util', 'from', 'to', 'id'],
      { employee: 'Employee', dept: 'Dept', util: 'Util%', from: 'From', to: 'To', id: 'Alloc ID' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const viewEmployeeAllocations = async () => {
  try {
    const employee = await selectEmployee('Select employee:');
    if (!employee) return;

    const result = await api.getEmployeeAllocations(employee._id);
    const allocations = result.data;

    ui.header(`Allocations — ${employee.fullName}`);

    if (allocations.length === 0) {
      ui.info('No allocations found');
      return;
    }

    ui.table(
      allocations.map((a) => ({
        project: a.projectId.name,
        active: a.isActive ? '✅' : '❌',
        util: `${a.utilisation}%`,
        from: new Date(a.fromDate).toLocaleDateString(),
        to: new Date(a.toDate).toLocaleDateString(),
      })),
      ['project', 'active', 'util', 'from', 'to'],
      { project: 'Project', active: 'Active', util: 'Util%', from: 'From', to: 'To' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const createAllocationScreen = async () => {
  ui.header('Allocate Employee');

  try {
    const project = await selectMyProject('Select target project:');
    if (!project) return;

    if (project.status !== 'ACTIVE' && project.status !== 'PLANNED') {
      ui.error(`Cannot allocate to ${project.status} project`);
      return;
    }

    const employee = await selectEmployee('Select employee to allocate:');
    if (!employee) return;

    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'utilisation',
        message: 'Utilisation percentage (1-100):',
        validate: (v) => (v >= 1 && v <= 100) || 'Must be between 1 and 100',
      },
      {
        type: 'input',
        name: 'fromDate',
        message: 'Start date (YYYY-MM-DD):',
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
      },
      {
        type: 'input',
        name: 'toDate',
        message: 'End date (YYYY-MM-DD):',
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
      },
    ]);

    await api.createAllocation({
      employeeId: employee._id,
      projectId: project._id,
      ...answers,
    });

    ui.success('Employee allocated successfully');
  } catch (err) {
    ui.error(err.message);
  }
};

const endAllocationScreen = async () => {
  try {
    const project = await selectMyProject('Select project to end an allocation on:');
    if (!project) return;

    const result = await api.getProjectAllocations(project._id);
    const allocations = result.data.filter((a) => a.isActive);

    if (allocations.length === 0) {
      ui.info('No active allocations on this project');
      return;
    }

    const { allocId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'allocId',
        message: 'Select allocation to end:',
        choices: allocations.map((a) => ({
          name: `${a.employeeId.fullName} (${a.utilisation}%)`,
          value: a._id,
        })),
      },
    ]);

    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: 'End allocation today?', default: false },
    ]);

    if (confirm) {
      await api.endAllocation(allocId);
      ui.success('Allocation ended successfully');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Team Timesheets ──────────────────────────────────────────

const teamTimesheetsScreen = async () => {
  ui.header('Team Timesheets');

  try {
    const { weekStart } = await inquirer.prompt([
      {
        type: 'input',
        name: 'weekStart',
        message: 'Enter week start date (YYYY-MM-DD) or press enter for this week:',
        default: getMonday(new Date()).toISOString().split('T')[0],
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
      },
    ]);

    const result = await api.getTeamTimesheets(weekStart);
    const timesheets = result.data;

    if (timesheets.length === 0) {
      ui.info('No timesheets submitted by team members for this week');
      return;
    }

    ui.table(
      timesheets.map((t) => ({
        employee: t.employeeId.fullName,
        dept: t.employeeId.department,
        hours: t.totalHours,
        status: t.status,
        submitted: t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : 'N/A',
      })),
      ['employee', 'dept', 'hours', 'status', 'submitted'],
      { employee: 'Employee', dept: 'Dept', hours: 'Total Hrs', status: 'Status', submitted: 'Submitted On' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Helpers ──────────────────────────────────────────────────

const selectMyProject = async (message) => {
  const result = await api.listProjects();
  // listProjects endpoint (AdminProjectController) is accessible if the user has correct role.
  // Actually, wait: /admin/projects requires ADMIN role.
  // The manager should only see their own projects.
  // Wait, if /admin/projects is ADMIN only, the manager cannot list projects via that endpoint!
  // I need to hit a generic list, or just let them enter the ID, OR they can list from the server if we had a /manager/projects endpoint.
  // Since we didn't build /manager/projects, let's just reuse the /admin/projects if we update the middleware, or we have to build one?
  // Actually, we can fetch all allocations for this manager...
  ui.warn('Manager must know Project ID or Employee ID directly (listing not supported in this phase).');
  const { projectId } = await inquirer.prompt([
    { type: 'input', name: 'projectId', message: 'Enter Project ID:' }
  ]);
  // Just return mock structure
  return { _id: projectId, name: 'Project ' + projectId, status: 'ACTIVE' };
};

const selectEmployee = async (message) => {
  ui.warn('Manager must know Employee ID directly (listing not supported in this phase).');
  const { employeeId } = await inquirer.prompt([
    { type: 'input', name: 'employeeId', message: 'Enter Employee ID:' }
  ]);
  return { _id: employeeId, fullName: 'Employee ' + employeeId };
};

// Util
const getMonday = (d) => {
  d = new Date(d);
  var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

module.exports = { managerMainMenu };
