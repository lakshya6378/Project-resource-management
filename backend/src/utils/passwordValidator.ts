import { PASSWORD_RULES } from '../config/constants';

/**
 * Password Validator
 *
 * Enforces password strength rules defined in the BRD:
 *   - Minimum 8 characters
 *   - At least one uppercase letter
 *   - At least one number
 *
 * Used for:
 *   - Admin creating user accounts (temporary password)
 *   - User changing password on first login
 *   - Admin resetting user password
 */

/**
 * Validate a password against strength rules.
 *
 * @param {string} password - Password to validate
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters`);
  }

  if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_RULES.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export { validatePassword };
