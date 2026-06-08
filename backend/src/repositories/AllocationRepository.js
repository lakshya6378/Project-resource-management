const { Allocation } = require('../models');

/**
 * AllocationRepository — Data Access Layer for Allocation model.
 *
 * The most query-intensive repository due to overlap detection.
 * Compound indexes on {employeeId, fromDate, toDate, isActive}
 * and {projectId, isActive} ensure these queries are performant.
 */
class AllocationRepository {
  /**
   * Find all active allocations for an employee that overlap a given date range.
   * Core query for over-allocation validation.
   *
   * Two ranges overlap when: existingFrom <= newTo AND newFrom <= existingTo
   */
  async findActiveByEmployeeInRange(employeeId, fromDate, toDate) {
    return Allocation.find({
      employeeId,
      isActive: true,
      fromDate: { $lte: new Date(toDate) },
      toDate: { $gte: new Date(fromDate) },
    }).populate('projectId', 'name');
  }

  /**
   * Find all active allocations for an employee covering a specific date (today).
   * Used by the scheduler for utilisation computation.
   */
  async findActiveByEmployeeOnDate(employeeId, date) {
    const d = new Date(date);
    return Allocation.find({
      employeeId,
      isActive: true,
      fromDate: { $lte: d },
      toDate: { $gte: d },
    });
  }

  /**
   * Find all active allocations for a project.
   */
  async findByProject(projectId, activeOnly = true) {
    const query = { projectId };
    if (activeOnly) query.isActive = true;

    return Allocation.find(query)
      .populate('employeeId', 'fullName department')
      .sort({ fromDate: -1 });
  }

  /**
   * Find all allocations with optional filters (company-wide view).
   */
  async findAll(filters = {}) {
    const query = {};

    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return Allocation.find(query)
      .populate('employeeId', 'fullName department')
      .populate('projectId', 'name')
      .populate('managerId', 'fullName')
      .sort({ createdAt: -1 });
  }

  /**
   * Find allocations for a specific employee (for employee's own view).
   */
  async findByEmployee(employeeId) {
    return Allocation.find({ employeeId })
      .populate('projectId', 'name')
      .sort({ fromDate: -1 });
  }

  async findById(id) {
    return Allocation.findById(id)
      .populate('employeeId', 'fullName')
      .populate('projectId', 'name managerId');
  }

  async create(data) {
    const allocation = new Allocation(data);
    return allocation.save();
  }

  /**
   * End an allocation by setting toDate to today and isActive to false.
   */
  async endAllocation(id, endDate) {
    return Allocation.findByIdAndUpdate(
      id,
      { toDate: endDate, isActive: false },
      { returnDocument: 'after' }
    );
  }

  /**
   * End all active allocations for an employee (used when deactivating).
   */
  async endAllAllocationsForEmployee(employeeId, endDate) {
    return Allocation.updateMany(
      { employeeId, isActive: true },
      { $set: { toDate: endDate, isActive: false } }
    );
  }

  /**
   * Find all currently active allocations (used by scheduler).
   */
  async findAllActive(date) {
    const d = new Date(date);
    return Allocation.find({
      isActive: true,
      fromDate: { $lte: d },
      toDate: { $gte: d },
    });
  }
}

module.exports = new AllocationRepository();
