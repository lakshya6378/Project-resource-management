import express from 'express';
const router = express.Router();

import employeeController from '../controllers/EmployeeController';
import { validate } from '../middleware/validate';
import { submitTimesheetSchema, requestAccessSchema } from '../validators/timesheetSchemas';

/**
 * Employee Routes
 *
 * All routes require: verifyToken + requireRole('EMPLOYEE') + checkForcePasswordChange
 * (applied in server.js when mounting this router)
 */

/**
 * @swagger
 * /employee/my-allocations:
 *   get:
 *     tags: [Employee]
 *     summary: View own allocations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Allocations retrieved
 */
router.get('/my-allocations', employeeController.getMyAllocations);

/**
 * @swagger
 * /employee/timesheets/access-request:
 *   post:
 *     tags: [Employee]
 *     summary: Request access to a missed timesheet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weekStart, reason]
 *             properties:
 *               weekStart:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Access requested successfully
 */
router.post('/timesheets/access-request', validate(requestAccessSchema), employeeController.requestTimesheetAccess);

/**
 * @swagger
 * /employee/timesheets:
 *   post:
 *     tags: [Employee]
 *     summary: Submit a weekly timesheet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weekStart, entries]
 *             properties:
 *               weekStart:
 *                 type: string
 *                 format: date
 *                 description: Any day in the week, will be normalized to Monday
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [projectId, hours]
 *                   properties:
 *                     projectId:
 *                       type: string
 *                     hours:
 *                       type: number
 *                       minimum: 0
 *                     activityTags:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Timesheet submitted successfully
 *       400:
 *         description: Exceeds max hours, or allocated project check failed
 *       409:
 *         description: Timesheet already submitted for this week
 */
router.post('/timesheets', validate(submitTimesheetSchema), employeeController.submitTimesheet);

/**
 * @swagger
 * /employee/timesheets:
 *   get:
 *     tags: [Employee]
 *     summary: Get timesheet history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timesheets retrieved
 */
router.get('/timesheets', employeeController.getMyTimesheets);

/**
 * @swagger
 * /employee/timesheets/{weekStart}:
 *   get:
 *     tags: [Employee]
 *     summary: Get timesheet for a specific week
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: weekStart
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Timesheet retrieved
 */
router.get('/timesheets/:weekStart', employeeController.getTimesheetByWeek);

export default router;
