const allocationService = require('../services/AllocationService');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * ManagerAllocationController — Request Handlers for Allocation Management
 */
class ManagerAllocationController {
  /** POST /api/manager/allocations */
  async createAllocation(req, res, next) {
    try {
      const allocation = await allocationService.createAllocation(req.body, req.user.id);
      sendSuccess(res, allocation, 'Employee allocated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/manager/allocations/:id */
  async endAllocation(req, res, next) {
    try {
      const result = await allocationService.endAllocation(req.params.id, req.user.id);
      sendSuccess(res, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/manager/projects/:projectId/allocations */
  async listByProject(req, res, next) {
    try {
      const allocations = await allocationService.listByProject(
        req.params.projectId, req.user.id
      );
      sendSuccess(res, allocations, 'Project allocations retrieved');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/manager/employees/:employeeId/allocations */
  async listByEmployee(req, res, next) {
    try {
      const allocations = await allocationService.listByEmployee(req.params.employeeId);
      sendSuccess(res, allocations, 'Employee allocations retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ManagerAllocationController();
