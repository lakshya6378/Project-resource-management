import { employeeRepository, userRepository, allocationRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { ROLES, EMPLOYEE_STATUS } from '../config/constants';

/**
 * EmployeeService — Admin Employee Profile Management
 *
 * Handles creating, listing, updating, deactivating employee profiles,
 * and managing employee skills. Only accessible by Admins.
 *
 * Separation of Concerns: this service handles EMPLOYEE PROFILES.
 * UserService handles USER ACCOUNTS (login credentials).
 * An Employee always has a linked User account via userId.
 */
class EmployeeService {
  /**
   * Create an employee profile linked to an existing user account.
   *
   * Business rules:
   *   - userId must exist and be an active user
   *   - userId must have role EMPLOYEE or MANAGER (not ADMIN)
   *   - userId must not already have a linked employee profile
   *   - New employees start with status BENCH
   *
   * @param {Object} dto - { userId, fullName, email, department, designation }
   */
  async createEmployee(dto) {
    const { userId, fullName, email, department, designation } = dto;

    // Verify user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User account not found', 404);
    }

    // Verify user role is EMPLOYEE or MANAGER
    if (user.role === ROLES.ADMIN) {
      throw new AppError('Cannot create employee profile for admin accounts', 400);
    }

    // Check if employee profile already exists for this user
    const existing = await employeeRepository.findByUserId(userId);
    if (existing) {
      throw new AppError('Employee profile already exists for this user', 409);
    }

    const employee = await employeeRepository.create({
      userId,
      fullName,
      email: email.toLowerCase(),
      department,
      designation,
      status: EMPLOYEE_STATUS.BENCH,
      currentUtilisation: 0,
      skills: [],
      isActive: true,
    });

    return employee;
  }

  /**
   * List all employees with optional filters.
   *
   * @param {Object} filters - { status?, department? }
   * @returns {{ employees: Object[], counts: { total, allocated, bench } }}
   */
  async listEmployees(filters: any = {}) {
    const queryFilters: any = { ...filters };

    // By default only show active employees
    if (queryFilters.isActive === undefined) {
      queryFilters.isActive = true;
    }

    const employees = await employeeRepository.findAll(queryFilters);
    const counts = await employeeRepository.countByStatus();

    return { employees, counts };
  }

  /**
   * Get a single employee by ID.
   */
  async getEmployeeById(id) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return employee;
  }

  /**
   * Update employee profile fields.
   *
   * @param {string} id - Employee ID
   * @param {Object} dto - { fullName?, department?, designation? }
   */
  async updateEmployee(id, dto) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const allowedFields = ['fullName', 'department', 'designation'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    const updated = await employeeRepository.update(id, updateData);
    return updated;
  }

  /**
   * Deactivate an employee.
   *
   * Business rules:
   *   - Sets employee isActive = false and status = INACTIVE
   *   - Ends all active allocations (toDate = today)
   *   - Deactivates the linked user account
   *   - Historical data is preserved
   *
   * @param {string} id - Employee ID
   */
  async deactivateEmployee(id) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.isActive) {
      throw new AppError('Employee is already deactivated', 400);
    }

    // End all active allocations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await allocationRepository.endAllAllocationsForEmployee(employee._id, today);

    // Deactivate employee profile
    await employeeRepository.update(id, {
      isActive: false,
      status: EMPLOYEE_STATUS.INACTIVE,
      currentUtilisation: 0,
    });

    // Deactivate linked user account
    await userRepository.update(employee.userId, { isActive: false });

    const updated = await employeeRepository.findById(id);
    return updated;
  }

  // ─── Skills Management ──────────────────────────────────────

  /**
   * Get an employee's skills.
   */
  async getSkills(employeeId) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return employee.skills;
  }

  /**
   * Add a skill to an employee.
   *
   * @param {string} employeeId
   * @param {Object} skill - { name, category, proficiency }
   */
  async addSkill(employeeId, skill) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check for duplicate skill name (case-insensitive)
    const duplicate = employee.skills.find(
      (s) => s.name.toLowerCase() === skill.name.toLowerCase()
    );
    if (duplicate) {
      throw new AppError(`Skill '${skill.name}' already exists for this employee`, 409);
    }

    const updated = await employeeRepository.addSkill(employeeId, skill);
    return updated.skills;
  }

  /**
   * Update a skill's proficiency level.
   *
   * @param {string} employeeId
   * @param {string} skillId
   * @param {string} proficiency - Beginner / Intermediate / Advanced
   */
  async updateSkillProficiency(employeeId, skillId, proficiency) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const skill = employee.skills.id(skillId);
    if (!skill) {
      throw new AppError('Skill not found', 404);
    }

    const updated = await employeeRepository.updateSkill(employeeId, skillId, proficiency);
    return updated.skills;
  }

  /**
   * Remove a skill from an employee.
   */
  async removeSkill(employeeId, skillId) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const skill = employee.skills.id(skillId);
    if (!skill) {
      throw new AppError('Skill not found', 404);
    }

    const updated = await employeeRepository.removeSkill(employeeId, skillId);
    return updated.skills;
  }
}

export default new EmployeeService();
