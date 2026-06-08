const inquirer = require('inquirer');
const { loginScreen, changePasswordScreen } = require('./src/screens/authScreens');
const { userMenu } = require('./src/screens/adminUserScreens');
const { employeeMenu } = require('./src/screens/adminEmployeeScreens');
const api = require('./src/apiClient');
const ui = require('./src/ui');

/**
 * PRM Tool Console Application
 *
 * Entry point: runs login, then shows role-based main menu.
 * Currently supports ADMIN role. Manager and Employee roles
 * will be added in later phases.
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
      return main(); // Back to login
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

  switch (user.role) {
    case 'ADMIN':
      await adminMainMenu();
      break;
    case 'MANAGER':
      ui.warn('Manager console screens will be available in Phase 4');
      break;
    case 'EMPLOYEE':
      ui.warn('Employee console screens will be available in Phase 5');
      break;
  }
};

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
