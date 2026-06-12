import express from 'express';
const router = express.Router();

import managerAllocationController from '../controllers/ManagerAllocationController';
import managerTimesheetController from '../controllers/ManagerTimesheetController';
import managerProjectController from '../controllers/ManagerProjectController';
import managerEmployeeController from '../controllers/ManagerEmployeeController';
import { validate } from '../middleware/validate';
import { createAllocationSchema } from '../validators/allocationSchemas';
import { reviewAccessSchema } from '../validators/timesheetSchemas';

/**
 * Manager Routes
 *
 * All routes require: verifyToken + requireRole('MANAGER') + checkForcePasswordChange
 * (applied in server.js when mounting this router)
 */

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE / TEAM MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /manager/employees:
 *   get:
 *     tags: [Manager - Employees]
 *     summary: Get all employees assigned to the manager's team
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team employees retrieved
 */
router.get('/employees', managerEmployeeController.getTeamEmployees);

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

/**
 * @swagger
 * /manager/timesheets/pending-requests:
 *   get:
 *     tags: [Manager - Timesheets]
 *     summary: Get pending access requests from team members
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending access requests retrieved
 */
router.get('/timesheets/pending-requests', managerTimesheetController.getPendingRequests);

/**
 * @swagger
 * /manager/timesheets/{id}/review-access:
 *   post:
 *     tags: [Manager - Timesheets]
 *     summary: Approve or reject a timesheet access request
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
 *             required: [approved]
 *             properties:
 *               approved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Access reviewed successfully
 */
router.post('/timesheets/:id/review-access', validate(reviewAccessSchema), managerTimesheetController.reviewTimesheetAccess);

// ═══════════════════════════════════════════════════════════════
// AI CORE MODULE
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /manager/projects:
 *   get:
 *     tags: [Manager - Projects]
 *     summary: List manager's projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Projects list
 */
router.get('/projects', managerProjectController.getMyProjects);

/**
 * @swagger
 * /manager/projects/{id}/suggest-team:
 *   get:
 *     tags: [Manager - AI]
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

/**
 * @swagger
 * /manager/projects/{id}/risk-summary:
 *   get:
 *     tags: [Manager - AI]
 *     summary: Use AI to generate a risk summary for a project
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
 *         description: AI Risk Summary generated successfully
 */
router.get('/projects/:id/risk-summary', managerProjectController.generateRiskSummary);

/**
 * @swagger
 * /manager/ai/team-search:
 *   get:
 *     tags: [Manager - AI]
 *     summary: Use AI to search the organisation for an ideal team
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI Team Search generated successfully
 */
router.get('/ai/team-search', managerProjectController.teamSearch);

export default router;
