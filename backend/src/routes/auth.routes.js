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

// ─── Public Routes ───────────────────────────────────────────
router.post('/login', validate(loginSchema), authController.login);

// ─── Protected Routes (require valid JWT) ────────────────────
router.post(
  '/change-password',
  verifyToken,
  validate(changePasswordSchema),
  authController.changePassword
);

router.post('/logout', verifyToken, authController.logout);

module.exports = router;
