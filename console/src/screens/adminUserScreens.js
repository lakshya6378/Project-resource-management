const inquirer = require('inquirer');
const api = require('../apiClient');
const ui = require('../ui');

/**
 * Admin User Management Screens
 */

const userMenu = async () => {
  ui.header('Admin — User Management');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an action:',
      choices: [
        { name: '📋 List all users', value: 'list' },
        { name: '➕ Create new user', value: 'create' },
        { name: '🔒 Deactivate user', value: 'deactivate' },
        { name: '🔓 Reactivate user', value: 'reactivate' },
        { name: '🔑 Reset user password', value: 'reset' },
        new inquirer.Separator(),
        { name: '⬅️  Back to main menu', value: 'back' },
      ],
    },
  ]);

  switch (action) {
    case 'list':
      await listUsersScreen();
      break;
    case 'create':
      await createUserScreen();
      break;
    case 'deactivate':
      await deactivateUserScreen();
      break;
    case 'reactivate':
      await reactivateUserScreen();
      break;
    case 'reset':
      await resetPasswordScreen();
      break;
    case 'back':
      return;
  }

  // Loop back to user menu
  return userMenu();
};

const listUsersScreen = async () => {
  try {
    const result = await api.listUsers();
    const { users, counts } = result.data;

    ui.header('All Users');
    ui.info(`Total: ${counts.total} | Active: ${counts.active} | Inactive: ${counts.inactive}`);

    ui.table(
      users.map((u) => ({
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        active: u.isActive ? '✅' : '❌',
        id: u._id,
      })),
      ['username', 'fullName', 'role', 'active', 'id'],
      { username: 'Username', fullName: 'Full Name', role: 'Role', active: 'Active', id: 'ID' }
    );
  } catch (err) {
    ui.error(err.message);
  }
};

const createUserScreen = async () => {
  ui.header('Create New User');

  const answers = await inquirer.prompt([
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
      name: 'username',
      message: 'Username:',
      validate: (val) => val.length >= 3 || 'Min 3 characters',
    },
    {
      type: 'list',
      name: 'role',
      message: 'Role:',
      choices: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      type: 'password',
      name: 'tempPassword',
      message: 'Temporary password:',
      mask: '*',
      validate: (val) => {
        if (val.length < 8) return 'Min 8 characters';
        if (!/[A-Z]/.test(val)) return 'Need 1 uppercase';
        if (!/[0-9]/.test(val)) return 'Need 1 number';
        return true;
      },
    },
  ]);

  try {
    const result = await api.createUser(answers);
    ui.success(`User '${result.data.username}' created (ID: ${result.data._id})`);
  } catch (err) {
    ui.error(err.message);
  }
};

const deactivateUserScreen = async () => {
  try {
    const result = await api.listUsers();
    const activeUsers = result.data.users.filter((u) => u.isActive);

    if (activeUsers.length === 0) {
      ui.info('No active users to deactivate');
      return;
    }

    const { userId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'userId',
        message: 'Select user to deactivate:',
        choices: activeUsers.map((u) => ({
          name: `${u.fullName} (${u.username}) — ${u.role}`,
          value: u._id,
        })),
      },
    ]);

    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: 'Are you sure?', default: false },
    ]);

    if (confirm) {
      await api.deactivateUser(userId);
      ui.success('User deactivated');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

const reactivateUserScreen = async () => {
  try {
    const result = await api.listUsers();
    const inactiveUsers = result.data.users.filter((u) => !u.isActive);

    if (inactiveUsers.length === 0) {
      ui.info('No inactive users to reactivate');
      return;
    }

    const { userId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'userId',
        message: 'Select user to reactivate:',
        choices: inactiveUsers.map((u) => ({
          name: `${u.fullName} (${u.username}) — ${u.role}`,
          value: u._id,
        })),
      },
    ]);

    await api.reactivateUser(userId);
    ui.success('User reactivated');
  } catch (err) {
    ui.error(err.message);
  }
};

const resetPasswordScreen = async () => {
  try {
    const result = await api.listUsers();
    const users = result.data.users;

    const { userId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'userId',
        message: 'Select user to reset password:',
        choices: users.map((u) => ({
          name: `${u.fullName} (${u.username})`,
          value: u._id,
        })),
      },
    ]);

    const { tempPassword } = await inquirer.prompt([
      {
        type: 'password',
        name: 'tempPassword',
        message: 'New temporary password:',
        mask: '*',
        validate: (val) => {
          if (val.length < 8) return 'Min 8 characters';
          if (!/[A-Z]/.test(val)) return 'Need 1 uppercase';
          if (!/[0-9]/.test(val)) return 'Need 1 number';
          return true;
        },
      },
    ]);

    await api.resetPassword(userId, tempPassword);
    ui.success('Password reset. User must change on next login.');
  } catch (err) {
    ui.error(err.message);
  }
};

module.exports = { userMenu };
