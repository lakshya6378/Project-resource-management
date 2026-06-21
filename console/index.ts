import inquirer from 'inquirer';
import { loginScreen, changePasswordScreen } from './src/screens/authScreens';
import { userMenu } from './src/screens/adminUserScreens';
import { employeeMenu as resourceMenu } from './src/screens/adminResourceScreens';
import { projectMenu } from './src/screens/adminProjectScreens';
import { configMenu } from './src/screens/adminConfigScreen';
import { managerMainMenu } from './src/screens/managerScreens';
import { employeeMainMenu } from './src/screens/employeeScreens';
import { globalSkillsMenu } from './src/screens/adminSkillsScreens';
import api from './src/apiClient';
import ui from './src/ui';

/**
 * PRM Tool Console Application
 *
 * Entry point: runs login, then shows role-based main menu.
 */

const unifiedMainMenu = async (user) => {
  const dateStr = new Date().toLocaleString();
  ui.header('Main Menu', `Welcome ${user.fullName} ${dateStr}`);

  const perms = user.permissions || [];

  const choices: any[] = [];

  // ─── ADMIN MENU ITEMS ───
  if (perms.includes('MANAGE_EMPLOYEES')) {
    choices.push({ name: 'Resource Management', value: 'employees' });
  }
  if (perms.includes('MANAGE_PROJECTS_ALL') || perms.includes('VIEW_PROJECTS_ALL')) {
    choices.push({ name: 'Manage Projects', value: 'projects' });
  }
  if (perms.includes('VIEW_ALLOCATIONS_ALL')) {
    choices.push({ name: 'View All Allocations', value: 'admin_allocations' });
  }
  if (perms.includes('MANAGE_USERS')) {
    choices.push({ name: 'Manage Users', value: 'users' });
  }
  if (perms.includes('MANAGE_SYSTEM')) {
    choices.push({ name: 'System Configuration', value: 'config' });
  }
  if (perms.includes('MANAGE_SKILLS')) {
    choices.push({ name: 'Manage Global Skills', value: 'global_skills' });
  }

  // ─── MANAGER MENU ITEMS ───
  if (perms.includes('VIEW_TEAM_DASHBOARD')) {
    choices.push({ name: 'Resource Dashboard', value: 'resource_dashboard' });
  }
  if (perms.includes('MANAGE_TEAM_ALLOCATIONS')) {
    choices.push({ name: 'Allocate Resource', value: 'allocate_resource' });
  }
  if (perms.includes('VIEW_PROJECTS') && !perms.includes('MANAGE_PROJECTS_ALL')) {
    choices.push({ name: 'My Projects', value: 'manager_projects' });
  }
  if (perms.includes('REVIEW_TIMESHEETS')) {
    choices.push({ name: 'Timesheets', value: 'manager_timesheets' });
  }
  if (perms.includes('MANAGE_TEAM_ALLOCATIONS')) {
    choices.push({ name: 'AI Assistant', value: 'ai_assistant' });
  }

  if (perms.includes('SUBMIT_TIMESHEET') && user.role === 'EMPLOYEE') {
    choices.push({ name: 'Timesheets', value: 'employee_timesheets' });
    choices.push({ name: 'My Allocations', value: 'employee_allocations' });
  }

  choices.push(new inquirer.Separator());
  choices.push({ name: 'Change My Password', value: 'password' });
  choices.push({ name: 'Logout & Exit', value: 'logout' });

  const { action } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'action',
      message: 'What would you like to do?',
      choices,
    },
  ]);

  switch (action) {
    case 'users':
      await userMenu();
      break;
    case 'employees':
      await resourceMenu();
      break;
    case 'global_skills':
      await globalSkillsMenu();
      break;
    case 'projects':
      await projectMenu(perms);
      break;
    case 'admin_allocations':
      const { listAllAllocationsScreen } = require('./src/screens/adminAllocationScreens');
      await listAllAllocationsScreen();
      break;
    case 'config':
      await configMenu();
      break;

    // Manager
    case 'resource_dashboard':
      const { resourceDashboardScreen } = require('./src/screens/managerScreens');
      await resourceDashboardScreen();
      break;
    case 'allocate_resource':
      const { allocationsMenu } = require('./src/screens/managerScreens');
      await allocationsMenu();
      break;
    case 'manager_projects':
      const { myProjectsScreen } = require('./src/screens/managerScreens');
      await myProjectsScreen();
      break;
    case 'manager_timesheets':
      const { managerTimesheetsMenu } = require('./src/screens/managerScreens');
      await managerTimesheetsMenu();
      break;
    case 'ai_assistant':
      const { aiAssistantMenu } = require('./src/screens/managerScreens');
      await aiAssistantMenu();
      break;

    // Employee
    case 'employee_timesheets':
      const { employeeMainMenu } = require('./src/screens/employeeScreens');
      await employeeMainMenu(user); // Wait, employeeScreens might need decoupling too. Let's just launch it for now.
      break;
    case 'employee_allocations':
      // The old employeeMainMenu handles these, so let's just let it be called for now
      const empMenu = require('./src/screens/employeeScreens').employeeMainMenu;
      await empMenu(user);
      break;
    case 'password':
      const { changePasswordScreen } = require('./src/screens/authScreens');
      await changePasswordScreen();
      break;
    case 'logout':
      try {
        await api.logout();
        api.clearToken();
        ui.success('Logged out successfully.');
      } catch (err) {
        ui.error(err.message);
      }
      process.exit(0);
  }

  return unifiedMainMenu(user);
};

const main = async () => {
  console.clear();
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║   PRM Tool — Console Application          ║');
  console.log('  ║   Project & Resource Management           ║');
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');

  const { initAction } = await inquirer.prompt([
    {
      type: 'list', loop: false,
      name: 'initAction',
      message: 'Welcome to PRM Tool',
      choices: [
        { name: 'Login', value: 'login' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (initAction === 'exit') {
    ui.info('Goodbye!');
    process.exit(0);
  }

  const user = await loginScreen();

  // If forcePasswordChange is true, force them to change it now
  if (user.forcePasswordChange) {
    ui.warn('You must change your password before continuing.');
    await changePasswordScreen();
    ui.success('Please log in again with your new password.');
    return main();
  }

  const action = await unifiedMainMenu(user);

  if (action === 'LOGOUT') {
    return main(); // Back to login
  }
};

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

