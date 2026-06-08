const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { verifyToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginSchema, changePasswordSchema } = require('../validators/authSchemas');

/**
 * Auth Routes
 *
 * POST /api/auth/login          — Public: authenticate and get JWT
 * POST /api/auth/change-password — Protected: change own password
 * POST /api/auth/logout          — Protected: invalidate current token
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with username and password
 *     description: Authenticates a user and returns a JWT token. First-time users will have forcePasswordChange=true.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials or inactive account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change password
 *     description: Change the authenticated user's password. Required on first login (forcePasswordChange). New password must differ from current and meet strength requirements (8+ chars, 1 uppercase, 1 number).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect or new password doesn't meet requirements
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/change-password',
  verifyToken,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout and invalidate token
 *     description: Blacklists the current JWT token. Subsequent requests with this token will be rejected.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', verifyToken, authController.logout);

module.exports = router;
