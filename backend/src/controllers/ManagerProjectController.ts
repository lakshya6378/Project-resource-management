import aiService from '../services/AiService';
import { sendSuccess } from '../utils/responseHelper';

/**
 * ManagerProjectController — Handles project-level actions for managers
 */
class ManagerProjectController {
  /** GET /api/manager/projects/:id/suggest-team */
  async suggestTeam(req, res, next) {
    try {
      const { id: projectId } = req.params;
      const { requirements } = req.query;
      const suggestion = await aiService.suggestTeam(projectId, req.user.id, requirements);
      
      sendSuccess(res, suggestion, 'AI Team Suggestion generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/manager/projects */
  async getMyProjects(req, res, next) {
    try {
      const projectService = require('../services/ProjectService').default;
      const result = await projectService.listProjects({ managerId: req.user.id });
      sendSuccess(res, result, 'Manager projects retrieved');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/manager/projects/:id/risk-summary */
  async generateRiskSummary(req, res, next) {
    try {
      const { id: projectId } = req.params;
      const summary = await aiService.generateRiskSummary(projectId, req.user.id);
      sendSuccess(res, summary, 'AI Risk Summary generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/manager/ai/team-search */
  async teamSearch(req, res, next) {
    try {
      const { query } = req.query;
      const suggestion = await aiService.teamSearch(query, req.user.id);
      sendSuccess(res, suggestion, 'AI Team Search generated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new ManagerProjectController();
