import resourceService from '../services/ResourceService';
import { sendSuccess } from '../utils/responseHelper';

class ManagerEmployeeController {
  /**
   * GET /api/manager/employees
   * Retrieves all employees assigned to the requesting manager
   */
  async getTeamEmployees(req, res, next) {
    try {
      // Pass managerId as a filter to listEmployees
      const result = await resourceService.listEmployees({ managerId: req.user.id });
      sendSuccess(res, result, 'Team employees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new ManagerEmployeeController();
