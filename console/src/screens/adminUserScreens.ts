import inquirer from 'inquirer';
import api from '../apiClient';
import ui from '../ui';

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

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Options:',
        choices: [
          { name: '🔓 Reactivate a user', value: 'reactivate' },
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'reactivate') {
      await reactivateUserScreen();
    }
  } catch (err) {
    ui.error(err.message);
  }
};

const createUserScreen = async () => {
  ui.header('Create New User & Employee Profile');

  try {
    const [rolesResult, deptsResult] = await Promise.all([
      api.listRoles(),
      api.listDepartments()
    ]);
    const roles = rolesResult.data;
    const depts = deptsResult.data;

    if (depts.length === 0) {
      ui.error('No departments found. Please seed the database or create departments first.');
      return;
    }

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
        name: 'roleId',
        message: 'Select user role:',
        choices: roles.map(r => ({ name: r.name, value: r._id })),
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
          if (!/[^A-Za-z0-9]/.test(val)) return 'Need 1 special character';
          return true;
        },
      },
      {
        type: 'list',
        name: 'departmentId',
        message: 'Department:',
        choices: depts.map(d => ({ name: d.name, value: d._id })),
      }
    ]);

    // Fetch designations for the selected department
    const desigsResult = await api.listDesignations(answers.departmentId);
    const desigs = desigsResult.data;

    if (desigs.length === 0) {
      ui.error('No designations found for this department. Cannot proceed.');
      return;
    }

    const { designationId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'designationId',
        message: 'Designation:',
        choices: desigs.map(d => ({ name: d.title, value: d._id })),
      }
    ]);

    const { confirmAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirmAction',
        message: 'Options:',
        choices: [
          { name: '💾 Save', value: 'save' },
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (confirmAction === 'back') return;

    // 1. Create User
    const userResult = await api.createUser({
      fullName: answers.fullName,
      email: answers.email,
      username: answers.username,
      tempPassword: answers.tempPassword,
      roleId: answers.roleId,
    });
    
    const userId = userResult.data._id;
    ui.success(`User credentials created (ID: ${userId})`);

    // 2. Create Employee Profile
    await api.createEmployee({
      userId,
      departmentId: answers.departmentId,
      designationId,
    });
    
    ui.success(`Employee profile & allocations setup completely!`);

  } catch (err) {
    ui.error(err.message);
    if (err.errors && err.errors.length > 0) {
      err.errors.forEach((e: any) => console.log(`  - ${e.field}: ${e.message}`));
    }
  }
};

const deactivateUserScreen = async () => {
  try {
    const { userId } = await inquirer.prompt([
      { type: 'input', name: 'userId', message: 'Enter User ID to deactivate:' }
    ]);

    const result = await api.listUsers();
    const user = result.data.users.find(u => u._id === userId && u.isActive);

    if (!user) {
      ui.error('Active user not found with that ID.');
      return;
    }

    ui.detail(user, [
      { key: '_id', label: 'ID' },
      { key: 'fullName', label: 'Name' },
      { key: 'username', label: 'Username' },
      { key: 'role', label: 'Role' },
    ]);

    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: 'Are you sure you want to deactivate this user?', default: false },
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
    const { userId } = await inquirer.prompt([
      { type: 'input', name: 'userId', message: 'Enter User ID to reactivate:' }
    ]);

    const result = await api.listUsers();
    const user = result.data.users.find(u => u._id === userId && !u.isActive);

    if (!user) {
      ui.error('Inactive user not found with that ID.');
      return;
    }

    ui.detail(user, [
      { key: '_id', label: 'ID' },
      { key: 'fullName', label: 'Name' },
      { key: 'username', label: 'Username' },
      { key: 'role', label: 'Role' },
    ]);

    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: 'Are you sure you want to reactivate this user?', default: false },
    ]);

    if (confirm) {
      await api.reactivateUser(userId);
      ui.success('User reactivated');
    }
  } catch (err) {
    ui.error(err.message);
  }
};

const resetPasswordScreen = async () => {
  try {
    const { userId } = await inquirer.prompt([
      { type: 'input', name: 'userId', message: 'Enter User ID to reset password:' }
    ]);

    const result = await api.listUsers();
    const user = result.data.users.find(u => u._id === userId);

    if (!user) {
      ui.error('User not found with that ID.');
      return;
    }

    ui.detail(user, [
      { key: '_id', label: 'ID' },
      { key: 'fullName', label: 'Name' },
      { key: 'username', label: 'Username' },
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

    const { confirmAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirmAction',
        message: 'Options:',
        choices: [
          { name: '💾 Save', value: 'save' },
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    if (confirmAction === 'back') return;

    await api.resetPassword(userId, tempPassword);
    ui.success('Password reset. User must change on next login.');
  } catch (err) {
    ui.error(err.message);
  }
};

export { userMenu };
