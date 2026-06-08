const inquirer = require('inquirer');
const api = require('../apiClient');
const ui = require('../ui');

/**
 * Admin Project Management Screens
 */

const projectMenu = async () => {
  ui.header('Admin — Project Management');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an action:',
      choices: [
        { name: '📋 List all projects', value: 'list' },
        { name: '➕ Create new project', value: 'create' },
        { name: '📄 View project detail', value: 'detail' },
        { name: '✏️  Update project', value: 'update' },
        { name: '🏁 Manage milestones', value: 'milestones' },
        new inquirer.Separator(),
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  switch (action) {
    case 'list':
      await listProjectsScreen();
      break;
    case 'create':
      await createProjectScreen();
      break;
    case 'detail':
      await projectDetailScreen();
      break;
    case 'update':
      await updateProjectScreen();
      break;
    case 'milestones':
      await milestonesMenu();
      break;
    case 'back':
      return;
  }

  return projectMenu();
};

const listProjectsScreen = async () => {
  try {
    const { filterStatus } = await inquirer.prompt([
      {
        type: 'list',
        name: 'filterStatus',
        message: 'Filter by status:',
        choices: [
          { name: 'All', value: '' },
          { name: 'PLANNED', value: 'PLANNED' },
          { name: 'ACTIVE', value: 'ACTIVE' },
          { name: 'ON_HOLD', value: 'ON_HOLD' },
          { name: 'COMPLETED', value: 'COMPLETED' },
        ],
      },
    ]);

    const params = {};
    if (filterStatus) params.status = filterStatus;

    const result = await api.listProjects(params);
    const projects = result.data;

    ui.header('Projects');
    ui.info(`Total: ${projects.length}`);

    ui.table(
      projects.map((p) => ({
        name: p.name,
        manager: p.managerId?.fullName || 'N/A',
        status: p.status,
        start: new Date(p.startDate).toLocaleDateString(),
        end: new Date(p.endDate).toLocaleDateString(),
        milestones: p.milestones?.length || 0,
        id: p._id,
      })),
      ['name', 'manager', 'status', 'start', 'end', 'milestones', 'id'],
      {
        name: 'Project', manager: 'Manager', status: 'Status',
        start: 'Start', end: 'End', milestones: '#MS', id: 'ID',
      }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const createProjectScreen = async () => {
  ui.header('Create New Project');

  try {
    // Fetch managers for selection
    const usersResult = await api.listUsers();
    const managers = usersResult.data.users.filter(
      (u) => u.role === 'MANAGER' && u.isActive
    );

    if (managers.length === 0) {
      ui.warn('No managers available. Create a MANAGER user first.');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        validate: (v) => v.length >= 2 || 'Min 2 characters',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
      },
      {
        type: 'list',
        name: 'managerId',
        message: 'Assign manager:',
        choices: managers.map((m) => ({
          name: `${m.fullName} (${m.username})`,
          value: m._id,
        })),
      },
      {
        type: 'input',
        name: 'startDate',
        message: 'Start date (YYYY-MM-DD):',
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date format',
      },
      {
        type: 'input',
        name: 'endDate',
        message: 'End date (YYYY-MM-DD):',
        validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date format',
      },
    ]);

    const result = await api.createProject(answers);
    ui.success(`Project '${result.data.name}' created (ID: ${result.data._id})`);
  } catch (err) {
    ui.error(err.message);
  }
};

const projectDetailScreen = async () => {
  try {
    const project = await selectProject('Select project to view:');
    if (!project) return;

    const result = await api.getProject(project._id);
    const p = result.data;

    ui.header(`Project: ${p.name}`);
    ui.detail(p, [
      { key: '_id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
    ]);
    console.log(`  Manager: ${p.managerId?.fullName || 'N/A'}`);
    console.log(`  Start: ${new Date(p.startDate).toLocaleDateString()}`);
    console.log(`  End:   ${new Date(p.endDate).toLocaleDateString()}`);

    if (p.milestones && p.milestones.length > 0) {
      console.log('');
      ui.info('Milestones:');
      ui.table(
        p.milestones.map((m) => ({
          title: m.title,
          dueDate: new Date(m.dueDate).toLocaleDateString(),
          status: m.status,
          id: m._id,
        })),
        ['title', 'dueDate', 'status', 'id'],
        { title: 'Title', dueDate: 'Due Date', status: 'Status', id: 'Milestone ID' }
      );
    } else {
      ui.info('No milestones yet');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

const updateProjectScreen = async () => {
  try {
    const project = await selectProject('Select project to update:');
    if (!project) return;

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: `Name (${project.name}):`,
        default: project.name,
      },
      {
        type: 'input',
        name: 'description',
        message: `Description:`,
        default: project.description || '',
      },
      {
        type: 'list',
        name: 'status',
        message: `Status (${project.status}):`,
        choices: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'],
        default: project.status,
      },
    ]);

    await api.updateProject(project._id, answers);
    ui.success('Project updated');
  } catch (err) {
    ui.error(err.message);
  }
};

// ─── Milestones Sub-Menu ────────────────────────────────────

const milestonesMenu = async () => {
  const project = await selectProject('Select project for milestone management:');
  if (!project) return;

  const runMenu = async () => {
    // Refresh project data
    const result = await api.getProject(project._id);
    const p = result.data;

    ui.header(`Milestones — ${p.name}`);

    if (p.milestones && p.milestones.length > 0) {
      ui.table(
        p.milestones.map((m) => ({
          title: m.title,
          dueDate: new Date(m.dueDate).toLocaleDateString(),
          status: m.status,
          id: m._id,
        })),
        ['title', 'dueDate', 'status', 'id'],
        { title: 'Title', dueDate: 'Due', status: 'Status', id: 'ID' }
      );
    } else {
      ui.info('No milestones yet');
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [
          { name: '➕ Add milestone', value: 'add' },
          { name: '✏️  Update milestone status', value: 'update' },
          new inquirer.Separator(),
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'back') return;

    if (action === 'add') {
      const milestone = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Milestone title:',
          validate: (v) => v.length > 0 || 'Required',
        },
        {
          type: 'input',
          name: 'dueDate',
          message: 'Due date (YYYY-MM-DD):',
          validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date',
        },
      ]);
      try {
        await api.addMilestone(project._id, milestone);
        ui.success(`Milestone '${milestone.title}' added`);
      } catch (err) {
        ui.error(err.message);
      }
    }

    if (action === 'update' && p.milestones.length > 0) {
      const { milestoneId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'milestoneId',
          message: 'Select milestone:',
          choices: p.milestones.map((m) => ({
            name: `${m.title} (${m.status})`,
            value: m._id,
          })),
        },
      ]);
      const { status } = await inquirer.prompt([
        {
          type: 'list',
          name: 'status',
          message: 'New status:',
          choices: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'],
        },
      ]);
      try {
        await api.updateMilestoneStatus(project._id, milestoneId, status);
        ui.success('Milestone status updated');
      } catch (err) {
        ui.error(err.message);
      }
    }

    return runMenu();
  };

  return runMenu();
};

// ─── Helper ─────────────────────────────────────────────────

const selectProject = async (message) => {
  const result = await api.listProjects();
  const projects = result.data;

  if (projects.length === 0) {
    ui.info('No projects found');
    return null;
  }

  const { projId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projId',
      message,
      choices: projects.map((p) => ({
        name: `${p.name} — ${p.status} (${p.managerId?.fullName || 'No manager'})`,
        value: p._id,
      })),
    },
  ]);

  return projects.find((p) => p._id === projId);
};

module.exports = { projectMenu };
