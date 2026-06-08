const employeeService = require('../services/EmployeeService');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * AdminEmployeeController — Request Handlers for Admin Employee Management
 *
 * Thin controller — delegates to EmployeeService.
 * Covers CRUD operations and embedded skills management.
 */
class AdminEmployeeController {
  /**
   * POST /api/admin/employees
   * Body: { userId, fullName, email, department, designation }
   */
  async createEmployee(req, res, next) {
    try {
      const employee = await employeeService.createEmployee(req.body);
      sendSuccess(res, employee, 'Employee profile created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/employees
   * Query: ?status=BENCH&department=Engineering
   */
  async listEmployees(req, res, next) {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.department) filters.department = req.query.department;

      const result = await employeeService.listEmployees(filters);
      sendSuccess(res, result, 'Employees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/employees/:id
   */
  async getEmployee(req, res, next) {
    try {
      const employee = await employeeService.getEmployeeById(req.params.id);
      sendSuccess(res, employee, 'Employee retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/employees/:id
   * Body: { fullName?, department?, designation? }
   */
  async updateEmployee(req, res, next) {
    try {
      const employee = await employeeService.updateEmployee(req.params.id, req.body);
      sendSuccess(res, employee, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/employees/:id/deactivate
   */
  async deactivateEmployee(req, res, next) {
    try {
      const employee = await employeeService.deactivateEmployee(req.params.id);
      sendSuccess(res, employee, 'Employee deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Skills Endpoints ──────────────────────────────────────

  /**
   * GET /api/admin/employees/:id/skills
   */
  async getSkills(req, res, next) {
    try {
      const skills = await employeeService.getSkills(req.params.id);
      sendSuccess(res, skills, 'Skills retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/employees/:id/skills
   * Body: { name, category, proficiency }
   */
  async addSkill(req, res, next) {
    try {
      const skills = await employeeService.addSkill(req.params.id, req.body);
      sendSuccess(res, skills, 'Skill added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/employees/:id/skills/:skillId
   * Body: { proficiency }
   */
  async updateSkillProficiency(req, res, next) {
    try {
      const skills = await employeeService.updateSkillProficiency(
        req.params.id,
        req.params.skillId,
        req.body.proficiency
      );
      sendSuccess(res, skills, 'Skill proficiency updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/employees/:id/skills/:skillId
   */
  async removeSkill(req, res, next) {
    try {
      const skills = await employeeService.removeSkill(req.params.id, req.params.skillId);
      sendSuccess(res, skills, 'Skill removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminEmployeeController();
