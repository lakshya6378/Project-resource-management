import inquirer from 'inquirer';
import api from '../apiClient';
import ui from '../ui';

/**
 * Auth Screens — Login and Password Change flows.
 *
 * Returns the authenticated user object on success.
 * Handles forcePasswordChange flow automatically.
 */

/**
 * Login screen: prompts for username and password.
 * If login succeeds but forcePasswordChange is true, forces password change.
 *
 * @returns {Object} Authenticated user object { id, username, fullName, role }
 */
const loginScreen = async () => {
  ui.header('PRM Tool — Login');

  const { username, password } = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Username:',
      validate: (val) => val.length > 0 || 'Username is required',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
      validate: (val) => val.length > 0 || 'Password is required',
    },
  ]);

  try {
    const result = await api.login(username, password);
    api.setToken(result.data.token);
    const user = result.data.user;

    ui.success(`Welcome, ${user.fullName}! (Role: ${user.role})`);

    // Check if forced password change is required
    if (user.forcePasswordChange) {
      ui.warn('You must change your password before proceeding.');
      await changePasswordScreen(true);

      // Re-login with new password to get fresh token
      ui.info('Please log in again with your new password.');
      return loginScreen();
    }

    return user;
  } catch (err) {
    ui.error(err.message);
    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Try again?',
        default: true,
      },
    ]);

    if (retry) return loginScreen();
    process.exit(0);
  }
};

/**
 * Change password screen.
 * Prompts for current and new password with confirmation.
 */
const changePasswordScreen = async (isForced = false) => {
  ui.header('Change Password');

  if (!isForced) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Do you want to proceed?',
        choices: [
          { name: 'Proceed with Password Change', value: 'proceed' },
          { name: 'Go Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'back') return;
  }

  const { currentPassword, newPassword } = await inquirer.prompt([
    {
      type: 'password',
      name: 'currentPassword',
      message: 'Current password:',
      mask: '*',
      validate: (val) => val.length > 0 || 'Current password is required',
    },
    {
      type: 'password',
      name: 'newPassword',
      message: 'New password (min 8, 1 uppercase, 1 number, 1 special char):',
      mask: '*',
      validate: (val) => {
        if (val.length < 8) return 'Must be at least 8 characters';
        if (!/[A-Z]/.test(val)) return 'Must contain at least one uppercase letter';
        if (!/[0-9]/.test(val)) return 'Must contain at least one number';
        if (!/[^A-Za-z0-9]/.test(val)) return 'Must contain at least one special character';
        return true;
      },
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm new password:',
      mask: '*',
      validate: (val, answers) =>
        val === answers.newPassword || 'Passwords do not match',
    },
  ]);

  try {
    await api.changePassword(currentPassword, newPassword);
    ui.success('Password changed successfully!');
  } catch (err) {
    ui.error(err.message);
    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Try again?',
        default: true,
      },
    ]);
    if (retry) return changePasswordScreen();
  }
};

export { loginScreen, changePasswordScreen };
