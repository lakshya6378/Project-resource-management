const {
  allocationRepository,
  employeeRepository,
  projectRepository,
} = require('../repositories');
const { AppError } = require('../middleware/errorHandler');
const { PROJECT_STATUS, EMPLOYEE_STATUS } = require('../config/constants');

/**
 * AllocationService — Resource Allocation Management
 *
 * Handles creating and ending employee-to-project allocations.
 * Accessible by Managers (for their own projects) and Admins.
 *
 * Key business rules:
 *   - Total utilisation across overlapping allocations ≤ 100%
 *   - Only the project's assigned manager can allocate/end
 *   - Project must be ACTIVE or PLANNED
 *   - Employee must be active
 */
class AllocationService {
  /**
   * Allocate an employee to a project.
   *
   * @param {Object} dto - { employeeId, projectId, utilisation, fromDate, toDate }
   * @param {string} managerId - ID of the manager creating the allocation
   */
  async createAllocation(dto, managerId) {
    const { employeeId, projectId, utilisation, fromDate, toDate } = dto;

    // Validate project
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Verify manager owns this project
    const projManagerId = project.managerId?._id || project.managerId;
    if (projManagerId.toString() !== managerId.toString()) {
      throw new AppError('You can only allocate resources to your own projects', 403);
    }

    // Project must be ACTIVE or PLANNED
    if (![PROJECT_STATUS.ACTIVE, PROJECT_STATUS.PLANNED].includes(project.status)) {
      throw new AppError(`Cannot allocate to a ${project.status} project`, 400);
    }

    // Validate employee
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    if (!employee.isActive) {
      throw new AppError('Cannot allocate an inactive employee', 400);
    }

    // Date validation
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from >= to) {
      throw new AppError('From date must be before to date', 400);
    }

    // Check for over-allocation
    const overlapping = await allocationRepository.findActiveByEmployeeInRange(
      employeeId, from, to
    );
    const existingUtilisation = overlapping.reduce((sum, a) => sum + a.utilisation, 0);

    if (existingUtilisation + utilisation > 100) {
      throw new AppError(
        `Over-allocation: employee already at ${existingUtilisation}% during this period. ` +
        `Requested ${utilisation}% would total ${existingUtilisation + utilisation}%`,
        400
      );
    }

    const allocation = await allocationRepository.create({
      employeeId,
      projectId,
      managerId,
      utilisation,
      fromDate: from,
      toDate: to,
      isActive: true,
    });

    // Update employee status if on bench
    if (employee.status === EMPLOYEE_STATUS.BENCH) {
      await employeeRepository.update(employeeId, {
        status: EMPLOYEE_STATUS.ALLOCATED,
        currentUtilisation: existingUtilisation + utilisation,
      });
    } else {
      await employeeRepository.update(employeeId, {
        currentUtilisation: existingUtilisation + utilisation,
      });
    }

    return allocation;
  }

  /**
   * End an allocation early.
   *
   * @param {string} allocationId
   * @param {string} managerId - requesting manager
   */
  async endAllocation(allocationId, managerId) {
    const allocation = await allocationRepository.findById(allocationId);
    if (!allocation) {
      throw new AppError('Allocation not found', 404);
    }

    if (!allocation.isActive) {
      throw new AppError('Allocation is already ended', 400);
    }

    // Verify manager owns the project
    const projManagerId = allocation.projectId?.managerId || allocation.projectId;
    if (projManagerId.toString() !== managerId.toString()) {
      throw new AppError('You can only end allocations on your own projects', 403);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await allocationRepository.endAllocation(allocationId, today);

    // Recalculate employee utilisation
    await this._recalculateUtilisation(allocation.employeeId._id || allocation.employeeId);

    return { message: 'Allocation ended successfully' };
  }

  /**
   * List allocations for a project (manager's team view).
   */
  async listByProject(projectId, managerId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const projManagerId = project.managerId?._id || project.managerId;
    if (projManagerId.toString() !== managerId.toString()) {
      throw new AppError('You can only view allocations for your own projects', 403);
    }

    return allocationRepository.findByProject(projectId);
  }

  /**
   * List all allocations for an employee (resource view).
   */
  async listByEmployee(employeeId) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return allocationRepository.findByEmployee(employeeId);
  }

  /**
   * Recalculate an employee's current utilisation from active allocations.
   * @private
   */
  async _recalculateUtilisation(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAllocations = await allocationRepository.findActiveByEmployeeOnDate(
      employeeId, today
    );

    const totalUtil = activeAllocations.reduce((sum, a) => sum + a.utilisation, 0);
    const status = totalUtil > 0 ? EMPLOYEE_STATUS.ALLOCATED : EMPLOYEE_STATUS.BENCH;

    await employeeRepository.update(employeeId, {
      currentUtilisation: totalUtil,
      status,
    });
  }
}

module.exports = new AllocationService();
