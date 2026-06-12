import express from 'express';
const router = express.Router();

import adminUserController from '../controllers/AdminUserController';
import adminResourceController from '../controllers/AdminResourceController';
import adminProjectController from '../controllers/AdminProjectController';
import adminConfigController from '../controllers/AdminConfigController';
import adminSchedulerController from '../controllers/AdminSchedulerController';
import adminSkillsController from '../controllers/AdminSkillsController';
import adminOrgController from '../controllers/AdminOrgController';
import { validate } from '../middleware/validate';

// --- Org API ---
router.get('/departments', adminOrgController.listDepartments);
router.get('/designations', adminOrgController.listDesignations);

// --- Skills API ---
router.get('/skills/categories', adminSkillsController.listSkillCategories);
router.post('/skills/categories', adminSkillsController.createSkillCategory);
router.get('/skills', adminSkillsController.listSkills);
router.post('/skills', adminSkillsController.createSkill);

import { createUserSchema, resetPasswordSchema } from '../validators/userSchemas';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  addSkillSchema,
  updateSkillSchema,
  assignManagerSchema,
} from '../validators/employeeSchemas';
import {
  createProjectSchema,
  updateProjectSchema,
  addMilestoneSchema,
  updateMilestoneSchema,
} from '../validators/projectSchemas';
import { updateConfigSchema } from '../validators/configSchemas';

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
 * /admin/roles:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List all roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles listed successfully
 */
router.get('/roles', adminUserController.listRoles);

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
 * /admin/resources:
 *   post:
 *     tags: [Admin - Resources]
 *     summary: Create a resource profile
 *     description: Links a resource profile to an existing user account. User must have EMPLOYEE or MANAGER role.
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
 *         description: Resource profile created
 *       400:
 *         description: Cannot create profile for admin accounts
 *       404:
 *         description: User account not found
 *       409:
 *         description: Resource profile already exists for this user
 */
router.post('/resources', validate(createEmployeeSchema), adminResourceController.createEmployee);

/**
 * @swagger
 * /admin/resources:
 *   get:
 *     tags: [Admin - Resources]
 *     summary: List all resources
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
 *         description: Resources retrieved with counts (total/allocated/bench)
 */
router.get('/resources', adminResourceController.listEmployees);

/**
 * @swagger
 * /admin/allocations:
 *   get:
 *     tags: [Admin - Allocations]
 *     summary: List all company allocations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all active and past allocations
 */
import adminAllocationController from '../controllers/AdminAllocationController';
router.get('/allocations', adminAllocationController.listAllAllocations);

/**
 * @swagger
 * /admin/resources/{id}:
 *   get:
 *     tags: [Admin - Resources]
 *     summary: Get a single resource
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
 *         description: Resource details
 *       404:
 *         description: Resource not found
 */
router.get('/resources/:id', adminResourceController.getEmployee);

/**
 * @swagger
 * /admin/resources/{id}:
 *   put:
 *     tags: [Admin - Resources]
 *     summary: Update resource profile
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
 *         description: Resource updated
 *       404:
 *         description: Resource not found
 */
router.put('/resources/:id', validate(updateEmployeeSchema), adminResourceController.updateEmployee);

/**
 * @swagger
 * /admin/resources/{id}/assign-manager:
 *   put:
 *     tags: [Admin - Resources]
 *     summary: Assign a manager to a resource
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
 *             required: [managerId]
 *             properties:
 *               managerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Manager assigned
 *       400:
 *         description: Invalid manager ID
 *       404:
 *         description: Resource not found
 */
router.put('/resources/:id/assign-manager', validate(assignManagerSchema), adminResourceController.assignManager);

/**
 * @swagger
 * /admin/resources/{id}/deactivate:
 *   patch:
 *     tags: [Admin - Resources]
 *     summary: Deactivate a resource
 *     description: Ends all active allocations, deactivates resource profile and linked user account.
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
 *         description: Resource deactivated
 *       400:
 *         description: Already deactivated
 *       404:
 *         description: Resource not found
 */
router.patch('/resources/:id/deactivate', adminResourceController.deactivateEmployee);

// ─── Skills ──────────────────────────────────────────────────

/**
 * @swagger
 * /admin/resources/{id}/skills:
 *   get:
 *     tags: [Admin - Resources]
 *     summary: Get resource skills
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
router.get('/resources/:id/skills', adminResourceController.getSkills);

/**
 * @swagger
 * /admin/resources/{id}/skills:
 *   post:
 *     tags: [Admin - Resources]
 *     summary: Add a skill to a resource
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
router.post('/resources/:id/skills', validate(addSkillSchema), adminResourceController.addSkill);

/**
 * @swagger
 * /admin/resources/{id}/skills/{skillId}:
 *   put:
 *     tags: [Admin - Resources]
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
router.put('/resources/:id/skills/:skillId', validate(updateSkillSchema), adminResourceController.updateSkillProficiency);

/**
 * @swagger
 * /admin/resources/{id}/skills/{skillId}:
 *   delete:
 *     tags: [Admin - Resources]
 *     summary: Remove a skill from a resource
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
router.delete('/resources/:id/skills/:skillId', adminResourceController.removeSkill);

// ═══════════════════════════════════════════════════════════════
// PROJECT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /admin/projects:
 *   post:
 *     tags: [Admin - Projects]
 *     summary: Create a new project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, managerId, startDate, endDate]
 *             properties:
 *               name:
 *                 type: string
 *                 example: PRM Tool v2
 *               description:
 *                 type: string
 *               managerId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: '2026-01-01'
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: '2026-06-30'
 *     responses:
 *       201:
 *         description: Project created
 *       400:
 *         description: Invalid manager or date range
 */
router.post('/projects', validate(createProjectSchema), adminProjectController.createProject);

/**
 * @swagger
 * /admin/projects:
 *   get:
 *     tags: [Admin - Projects]
 *     summary: List all projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PLANNED, ACTIVE, ON_HOLD, COMPLETED]
 *       - in: query
 *         name: managerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projects list
 */
router.get('/projects', adminProjectController.listProjects);

/**
 * @swagger
 * /admin/projects/{id}:
 *   get:
 *     tags: [Admin - Projects]
 *     summary: Get a single project with milestones
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
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id', adminProjectController.getProject);

/**
 * @swagger
 * /admin/projects/{id}:
 *   put:
 *     tags: [Admin - Projects]
 *     summary: Update project details
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               managerId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [PLANNED, ACTIVE, ON_HOLD, COMPLETED]
 *     responses:
 *       200:
 *         description: Project updated
 *       404:
 *         description: Project not found
 */
router.put('/projects/:id', validate(updateProjectSchema), adminProjectController.updateProject);

/**
 * @swagger
 * /admin/projects/{id}/milestones:
 *   post:
 *     tags: [Admin - Projects]
 *     summary: Add a milestone to a project
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
 *             required: [title, dueDate]
 *             properties:
 *               title:
 *                 type: string
 *                 example: MVP Release
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: '2026-03-15'
 *     responses:
 *       201:
 *         description: Milestone added
 *       400:
 *         description: Due date outside project range
 *       409:
 *         description: Duplicate milestone title
 */
router.post('/projects/:id/milestones', validate(addMilestoneSchema), adminProjectController.addMilestone);

/**
 * @swagger
 * /admin/projects/{id}/milestones/{milestoneId}:
 *   put:
 *     tags: [Admin - Projects]
 *     summary: Update milestone status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [NOT_STARTED, IN_PROGRESS, DONE]
 *     responses:
 *       200:
 *         description: Milestone status updated
 *       404:
 *         description: Project or milestone not found
 */
router.put('/projects/:id/milestones/:milestoneId', validate(updateMilestoneSchema), adminProjectController.updateMilestoneStatus);

// ═══════════════════════════════════════════════════════════════
// SYSTEM CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /admin/config:
 *   get:
 *     tags: [Admin - Config]
 *     summary: Get system configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current system configuration
 */
router.get('/config', adminConfigController.getConfig);

/**
 * @swagger
 * /admin/config:
 *   put:
 *     tags: [Admin - Config]
 *     summary: Update system configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               llmProvider:
 *                 type: string
 *                 enum: [GEMINI, GROQ, LOCAL_GEMMA]
 *               llmApiKey:
 *                 type: string
 *               schedulerIntervalHours:
 *                 type: number
 *                 example: 4
 *               maxWeeklyHours:
 *                 type: number
 *                 example: 40
 *     responses:
 *       200:
 *         description: Configuration updated
 */
router.put('/config', validate(updateConfigSchema), adminConfigController.updateConfig);

// ═══════════════════════════════════════════════════════════════
// SCHEDULER & AUTOMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /admin/scheduler/trigger:
 *   post:
 *     tags: [Admin - Scheduler]
 *     summary: Manually trigger background jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler jobs triggered
 */
router.post('/scheduler/trigger', adminSchedulerController.triggerJobs);

export default router;
