const inquirer = require('inquirer');
const api = require('../apiClient');
const ui = require('../ui');

/**
 * Employee Console Screens
 *
 * Provides self-service for viewing allocations and submitting timesheets.
 */

const employeeMainMenu = async () => {
  ui.header('Employee Dashboard');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📋 View My Allocations', value: 'allocations' },
        { name: '⏱️  Submit Weekly Timesheet', value: 'submit_timesheet' },
        { name: '📅 View Timesheet History', value: 'history' },
        { name: '🔑 Change My Password', value: 'password' },
        new inquirer.Separator(),
        { name: '🚪 Logout', value: 'logout' },
      ],
    },
  ]);

  switch (action) {
    case 'allocations':
      await myAllocationsScreen();
      break;
    case 'submit_timesheet':
      await submitTimesheetScreen();
      break;
    case 'history':
      await timesheetHistoryScreen();
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

  return employeeMainMenu();
};

const myAllocationsScreen = async () => {
  ui.header('My Active Allocations');

  try {
    const result = await api.getMyAllocations();
    const allocations = result.data.filter((a) => a.isActive);

    if (allocations.length === 0) {
      ui.info('You have no active allocations at the moment.');
      return;
    }

    ui.table(
      allocations.map((a) => ({
        project: a.projectId.name,
        manager: a.managerId.fullName,
        util: `${a.utilisation}%`,
        from: new Date(a.fromDate).toLocaleDateString(),
        to: new Date(a.toDate).toLocaleDateString(),
        id: a.projectId._id,
      })),
      ['project', 'manager', 'util', 'from', 'to', 'id'],
      { project: 'Project', manager: 'Manager', util: 'Util%', from: 'From', to: 'To', id: 'Project ID' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const submitTimesheetScreen = async () => {
  ui.header('Submit Timesheet');

  try {
    // 1. Get current active allocations to know which projects they can log hours against
    const allocResult = await api.getMyAllocations();
    const activeAllocations = allocResult.data.filter((a) => a.isActive);

    if (activeAllocations.length === 0) {
      ui.error('You have no active allocations. You cannot submit timesheets.');
      return;
    }

    const { weekStart } = await inquirer.prompt([
      {
        type: 'input',
        name: 'weekStart',
        message: 'Enter week start date (YYYY-MM-DD) or press enter for this week:',
        default: getMonday(new Date()).toISOString().split('T')[0],
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
      },
    ]);

    const entries = [];
    let more = true;

    while (more) {
      const { projectId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectId',
          message: 'Select project:',
          choices: activeAllocations.map((a) => ({
            name: `${a.projectId.name} (Allocated: ${a.utilisation}%)`,
            value: a.projectId._id,
          })),
        },
      ]);

      const { hours } = await inquirer.prompt([
        {
          type: 'number',
          name: 'hours',
          message: 'Hours worked:',
          validate: (v) => v >= 0 || 'Hours cannot be negative',
        },
      ]);

      const { activityTagsStr } = await inquirer.prompt([
        {
          type: 'input',
          name: 'activityTagsStr',
          message: 'Activity tags (comma separated, optional):',
        },
      ]);

      entries.push({
        projectId,
        hours,
        activityTags: activityTagsStr ? activityTagsStr.split(',').map((t) => t.trim()) : [],
      });

      const { addAnother } = await inquirer.prompt([
        { type: 'confirm', name: 'addAnother', message: 'Add hours for another project?', default: false },
      ]);
      more = addAnother;
    }

    await api.submitTimesheet({ weekStart, entries });
    ui.success('Timesheet submitted successfully');

  } catch (err) {
    ui.error(err.message);
  }
};

const timesheetHistoryScreen = async () => {
  ui.header('Timesheet History');

  try {
    const result = await api.getMyTimesheets();
    const timesheets = result.data;

    if (timesheets.length === 0) {
      ui.info('No timesheets found.');
      return;
    }

    ui.table(
      timesheets.map((t) => ({
        week: new Date(t.weekStart).toLocaleDateString(),
        hours: t.totalHours,
        status: t.status,
        submitted: t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : 'Auto-generated',
      })),
      ['week', 'hours', 'status', 'submitted'],
      { week: 'Week Start', hours: 'Total Hrs', status: 'Status', submitted: 'Submitted On' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

// Util
const getMonday = (d) => {
  d = new Date(d);
  var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

module.exports = { employeeMainMenu };
