const express = require('express');
const router = express.Router();

const adminUserController = require('../controllers/AdminUserController');
const adminEmployeeController = require('../controllers/AdminEmployeeController');
const { validate } = require('../middleware/validate');
const { createUserSchema, resetPasswordSchema } = require('../validators/userSchemas');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  addSkillSchema,
  updateSkillSchema,
} = require('../validators/employeeSchemas');

/**
 * Admin Routes
 *
 * All routes require: verifyToken + requireRole('ADMIN') + checkForcePasswordChange
 * (applied in server.js when mounting this router)
 */

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /admin/users:
 *   post:
 *     tags: [Admin - Users]
 *     summary: Create a new user account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, username, tempPassword, role]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@company.com
 *               username:
 *                 type: string
 *                 example: johndoe
 *               tempPassword:
 *                 type: string
 *                 example: TempPass@1
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, EMPLOYEE]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already exists
 */
router.post('/users', validate(createUserSchema), adminUserController.createUser);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List all user accounts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved with counts (total/active/inactive)
 */
router.get('/users', adminUserController.listUsers);

/**
 * @swagger
 * /admin/users/{id}/deactivate:
 *   patch:
 *     tags: [Admin - Users]
 *     summary: Deactivate a user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 *       400:
 *         description: Cannot deactivate yourself or already deactivated
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/deactivate', adminUserController.deactivateUser);

/**
 * @swagger
 * /admin/users/{id}/reactivate:
 *   patch:
 *     tags: [Admin - Users]
 *     summary: Reactivate a deactivated user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User reactivated
 *       400:
 *         description: User is already active
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/reactivate', adminUserController.reactivateUser);

/**
 * @swagger
 * /admin/users/{id}/reset-password:
 *   post:
 *     tags: [Admin - Users]
 *     summary: Reset a user's password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempPassword]
 *             properties:
 *               tempPassword:
 *                 type: string
 *                 example: NewTemp@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       404:
 *         description: User not found
 */
router.post('/users/:id/reset-password', validate(resetPasswordSchema), adminUserController.resetPassword);

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /admin/employees:
 *   post:
 *     tags: [Admin - Employees]
 *     summary: Create an employee profile
 *     description: Links an employee profile to an existing user account. User must have EMPLOYEE or MANAGER role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, fullName, email, department, designation]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user account to link
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@company.com
 *               department:
 *                 type: string
 *                 example: Engineering
 *               designation:
 *                 type: string
 *                 example: Senior Developer
 *     responses:
 *       201:
 *         description: Employee profile created
 *       400:
 *         description: Cannot create profile for admin accounts
 *       404:
 *         description: User account not found
 *       409:
 *         description: Employee profile already exists for this user
 */
router.post('/employees', validate(createEmployeeSchema), adminEmployeeController.createEmployee);

/**
 * @swagger
 * /admin/employees:
 *   get:
 *     tags: [Admin - Employees]
 *     summary: List all employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BENCH, ALLOCATED, INACTIVE]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employees retrieved with counts (total/allocated/bench)
 */
router.get('/employees', adminEmployeeController.listEmployees);

/**
 * @swagger
 * /admin/employees/{id}:
 *   get:
 *     tags: [Admin - Employees]
 *     summary: Get a single employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
router.get('/employees/:id', adminEmployeeController.getEmployee);

/**
 * @swagger
 * /admin/employees/{id}:
 *   put:
 *     tags: [Admin - Employees]
 *     summary: Update employee profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               department:
 *                 type: string
 *               designation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Employee updated
 *       404:
 *         description: Employee not found
 */
router.put('/employees/:id', validate(updateEmployeeSchema), adminEmployeeController.updateEmployee);

/**
 * @swagger
 * /admin/employees/{id}/deactivate:
 *   patch:
 *     tags: [Admin - Employees]
 *     summary: Deactivate an employee
 *     description: Ends all active allocations, deactivates employee profile and linked user account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee deactivated
 *       400:
 *         description: Already deactivated
 *       404:
 *         description: Employee not found
 */
router.patch('/employees/:id/deactivate', adminEmployeeController.deactivateEmployee);

// ─── Skills ──────────────────────────────────────────────────

/**
 * @swagger
 * /admin/employees/{id}/skills:
 *   get:
 *     tags: [Admin - Employees]
 *     summary: Get employee skills
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skills list
 */
router.get('/employees/:id/skills', adminEmployeeController.getSkills);

/**
 * @swagger
 * /admin/employees/{id}/skills:
 *   post:
 *     tags: [Admin - Employees]
 *     summary: Add a skill to an employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, proficiency]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Node.js
 *               category:
 *                 type: string
 *                 enum: [Backend, Frontend, DevOps, QA, Other]
 *               proficiency:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced]
 *     responses:
 *       201:
 *         description: Skill added
 *       409:
 *         description: Duplicate skill name
 */
router.post('/employees/:id/skills', validate(addSkillSchema), adminEmployeeController.addSkill);

/**
 * @swagger
 * /admin/employees/{id}/skills/{skillId}:
 *   put:
 *     tags: [Admin - Employees]
 *     summary: Update skill proficiency
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [proficiency]
 *             properties:
 *               proficiency:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced]
 *     responses:
 *       200:
 *         description: Proficiency updated
 */
router.put('/employees/:id/skills/:skillId', validate(updateSkillSchema), adminEmployeeController.updateSkillProficiency);

/**
 * @swagger
 * /admin/employees/{id}/skills/{skillId}:
 *   delete:
 *     tags: [Admin - Employees]
 *     summary: Remove a skill from an employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill removed
 */
router.delete('/employees/:id/skills/:skillId', adminEmployeeController.removeSkill);

module.exports = router;
