const inquirer = require('inquirer');
const { loginScreen, changePasswordScreen } = require('./src/screens/authScreens');
const { userMenu } = require('./src/screens/adminUserScreens');
const { employeeMenu } = require('./src/screens/adminEmployeeScreens');
const { projectMenu } = require('./src/screens/adminProjectScreens');
const { configMenu } = require('./src/screens/adminConfigScreen');
const { managerMainMenu } = require('./src/screens/managerScreens');
const { employeeMainMenu } = require('./src/screens/employeeScreens');
const api = require('./src/apiClient');
const ui = require('./src/ui');

/**
 * PRM Tool Console Application
 *
 * Entry point: runs login, then shows role-based main menu.
 */

const adminMainMenu = async () => {
  ui.header('Admin Dashboard');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '👤 User Management', value: 'users' },
        { name: '👥 Employee Management', value: 'employees' },
        { name: '📁 Project Management', value: 'projects' },
        { name: '⚙️  System Configuration', value: 'config' },
        { name: '🔑 Change My Password', value: 'password' },
        new inquirer.Separator(),
        { name: '🚪 Logout', value: 'logout' },
      ],
    },
  ]);

  switch (action) {
    case 'users':
      await userMenu();
      break;
    case 'employees':
      await employeeMenu();
      break;
    case 'projects':
      await projectMenu();
      break;
    case 'config':
      await configMenu();
      break;
    case 'password':
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

  return adminMainMenu();
};

const main = async () => {
  console.clear();
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║   PRM Tool — Console Application          ║');
  console.log('  ║   Project & Resource Management            ║');
  console.log('  ╚═══════════════════════════════════════════╝');

  const user = await loginScreen();

  let action;
  switch (user.role) {
    case 'ADMIN':
      action = await adminMainMenu();
      break;
    case 'MANAGER':
      action = await managerMainMenu();
      break;
    case 'EMPLOYEE':
      action = await employeeMainMenu();
      break;
  }

  if (action === 'LOGOUT') {
    return main(); // Back to login
  }
};

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

