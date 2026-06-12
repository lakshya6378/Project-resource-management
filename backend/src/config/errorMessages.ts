export const ERROR_MESSAGES = Object.freeze({
  // Common / General
  USER_NOT_FOUND: 'User not found',
  INVALID_ROLE_ID: 'Invalid role ID',
  
  // Auth & Credentials
  USERNAME_EXISTS: 'Username already exists',
  EMAIL_EXISTS: 'Email already exists',
  INVALID_CREDENTIALS: 'Invalid username or password',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Contact your administrator.',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  PASSWORD_REUSE: 'New password must be different from the current password',
  CANNOT_DEACTIVATE_SELF: 'You cannot deactivate your own account',
  USER_ALREADY_ACTIVE: 'User is already active',
  USER_ALREADY_DEACTIVATED: 'User is already deactivated',

  // Employee Management
  DEPT_NOT_FOUND: 'Department not found',
  DESIG_NOT_FOUND: 'Designation not found',
  EMP_PROFILE_EXISTS: 'Employee profile already exists for this user',
  EMP_PROFILE_NOT_FOUND: 'Employee profile not found',
  RESOURCE_PROFILE_NOT_FOUND: 'Resource profile not found',
  USE_USER_DEACTIVATION: 'Use user deactivation instead',
  INVALID_MANAGER_ID: 'Invalid manager ID',

  // Skills
  CATEGORY_REQUIRED: 'Category name is required',
  CATEGORY_EXISTS: 'Skill category already exists',
  SKILL_NAME_REQ: 'Name and categoryId are required',
  INVALID_CAT_ID: 'Invalid category ID',
  SKILL_EXISTS: 'Skill already exists',
  RESOURCE_REQ_FOR_SKILL: 'Resource profile required to add skills',
  SKILL_NOT_FOUND_EMP: 'Skill not found for this employee',
});
