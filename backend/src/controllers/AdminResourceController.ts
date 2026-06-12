import resourceService from '../services/ResourceService';
import { sendSuccess } from '../utils/responseHelper';

/**
 * AdminResourceController — Request Handlers for Admin Resource Management
 *
 * Thin controller — delegates to ResourceService.
 * Covers CRUD operations and embedded skills management.
 */
class AdminResourceController {
  /**
   * POST /api/admin/resources
   * Body: { userId, fullName, email, department, designation }
   */
  async createEmployee(req, res, next) {
    try {
      const resource = await resourceService.createEmployee(req.body);
      sendSuccess(res, resource, 'Resource profile created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/resources
   * Query: ?status=BENCH&department=Engineering
   */
  async listEmployees(req, res, next) {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.department) filters.department = req.query.department;

      const result = await resourceService.listEmployees(filters);
      sendSuccess(res, result, 'Resources retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/resources/:id
   */
  async getEmployee(req, res, next) {
    try {
      const resource = await resourceService.getEmployeeById(req.params.id);
      sendSuccess(res, resource, 'Resource retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/resources/:id
   * Body: { fullName?, department?, designation? }
   */
  async updateEmployee(req, res, next) {
    try {
      const resource = await resourceService.updateEmployee(req.params.id, req.body);
      sendSuccess(res, resource, 'Resource updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/resources/:id/deactivate
   */
  async deactivateEmployee(req, res, next) {
    try {
      const resource = await resourceService.deactivateEmployee(req.params.id);
      sendSuccess(res, resource, 'Resource deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/resources/:id/assign-manager
   * Body: { managerId }
   */
  async assignManager(req, res, next) {
    try {
      const resource = await resourceService.assignManager(req.params.id, req.body.managerId);
      sendSuccess(res, resource, 'Manager assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Skills Endpoints ──────────────────────────────────────

  /**
   * GET /api/admin/resources/:id/skills
   */
  async getSkills(req, res, next) {
    try {
      const skills = await resourceService.getSkills(req.params.id);
      sendSuccess(res, skills, 'Skills retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/resources/:id/skills
   * Body: { name, category, proficiency }
   */
  async addSkill(req, res, next) {
    try {
      const skills = await resourceService.addSkill(req.params.id, req.body);
      sendSuccess(res, skills, 'Skill added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/resources/:id/skills/:skillId
   * Body: { proficiency }
   */
  async updateSkillProficiency(req, res, next) {
    try {
      const skills = await resourceService.updateSkillProficiency(
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
   * DELETE /api/admin/resources/:id/skills/:skillId
   */
  async removeSkill(req, res, next) {
    try {
      const skills = await resourceService.removeSkill(req.params.id, req.params.skillId);
      sendSuccess(res, skills, 'Skill removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminResourceController();
