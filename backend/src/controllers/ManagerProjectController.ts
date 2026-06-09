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
      const suggestion = await aiService.suggestTeam(projectId, req.user.id);
      
      sendSuccess(res, suggestion, 'AI Team Suggestion generated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new ManagerProjectController();
