const express = require('express');
const router = express.Router();

const managerAllocationController = require('../controllers/ManagerAllocationController');
const managerTimesheetController = require('../controllers/ManagerTimesheetController');
const managerProjectController = require('../controllers/ManagerProjectController');
const { validate } = require('../middleware/validate');
const { createAllocationSchema } = require('../validators/allocationSchemas');

/**
 * Manager Routes
 *
 * All routes require: verifyToken + requireRole('MANAGER') + checkForcePasswordChange
 * (applied in server.js when mounting this router)
 */

// ═══════════════════════════════════════════════════════════════
// ALLOCATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /manager/allocations:
 *   post:
 *     tags: [Manager - Allocations]
 *     summary: Allocate an employee to a project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, projectId, utilisation, fromDate, toDate]
 *             properties:
 *               employeeId:
 *                 type: string
 *               projectId:
 *                 type: string
 *               utilisation:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Employee allocated successfully
 *       400:
 *         description: Over-allocation, invalid dates, or invalid project status
 *       403:
 *         description: Manager does not own this project
 */
router.post('/allocations', validate(createAllocationSchema), managerAllocationController.createAllocation);

/**
 * @swagger
 * /manager/allocations/{id}:
 *   delete:
 *     tags: [Manager - Allocations]
 *     summary: End an allocation early
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
 *         description: Allocation ended successfully
 *       403:
 *         description: Manager does not own this project
 *       404:
 *         description: Allocation not found
 */
router.delete('/allocations/:id', managerAllocationController.endAllocation);

/**
 * @swagger
 * /manager/projects/{projectId}/allocations:
 *   get:
 *     tags: [Manager - Allocations]
 *     summary: List all active allocations for a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project allocations retrieved
 */
router.get('/projects/:projectId/allocations', managerAllocationController.listByProject);

/**
 * @swagger
 * /manager/employees/{employeeId}/allocations:
 *   get:
 *     tags: [Manager - Allocations]
 *     summary: List all allocations for a specific employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee allocations retrieved
 */
router.get('/employees/:employeeId/allocations', managerAllocationController.listByEmployee);

// ═══════════════════════════════════════════════════════════════
// TIMESHEET MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /manager/timesheets/team:
 *   get:
 *     tags: [Manager - Timesheets]
 *     summary: Get team timesheets for a specific week
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Team timesheets retrieved
 */
router.get('/timesheets/team', managerTimesheetController.getTeamTimesheets);

// ═══════════════════════════════════════════════════════════════
// AI CORE MODULE
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /manager/projects/{id}/suggest-team:
 *   get:
 *     tags: [Manager - Projects]
 *     summary: Use AI to suggest a team for a project
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
 *         description: AI Team Suggestion generated successfully
 *       400:
 *         description: AI not configured or no available staff
 */
router.get('/projects/:id/suggest-team', managerProjectController.suggestTeam);

module.exports = router;
