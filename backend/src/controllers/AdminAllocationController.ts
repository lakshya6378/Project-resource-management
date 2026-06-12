import allocationService from '../services/AllocationService';
import { sendSuccess } from '../utils/responseHelper';

class AdminAllocationController {
  /**
   * GET /api/admin/allocations
   */
  async listAllAllocations(req, res, next) {
    try {
      const allocations = await allocationService.listAllAllocations();
      sendSuccess(res, allocations, 'All allocations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminAllocationController();
