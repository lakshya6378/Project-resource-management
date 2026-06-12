import projectService from '../services/ProjectService';
import { sendSuccess } from '../utils/responseHelper';

/**
 * AdminProjectController — Request Handlers for Admin Project Management
 */
class AdminProjectController {
  /** POST /api/admin/projects */
  async createProject(req, res, next) {
    try {
      const project = await projectService.createProject(req.body);
      sendSuccess(res, project, 'Project created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/projects */
  async listProjects(req, res, next) {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.managerId) filters.managerId = req.query.managerId;

      const projects = await projectService.listProjects(filters);
      sendSuccess(res, projects, 'Projects retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/projects/:id */
  async getProject(req, res, next) {
    try {
      const project = await projectService.getProjectById(req.params.id);
      sendSuccess(res, project, 'Project retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/admin/projects/:id */
  async updateProject(req, res, next) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body);
      sendSuccess(res, project, 'Project updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Milestones ────────────────────────────────────────────

  /** POST /api/admin/projects/:id/milestones */
  async addMilestone(req, res, next) {
    try {
      const milestones = await projectService.addMilestone(req.params.id, req.body);
      sendSuccess(res, milestones, 'Milestone added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/admin/projects/:id/milestones/:milestoneId */
  async updateMilestoneStatus(req, res, next) {
    try {
      const milestones = await projectService.updateMilestoneStatus(
        req.params.id,
        req.params.milestoneId,
        req.body.status
      );
      sendSuccess(res, milestones, 'Milestone status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminProjectController();
