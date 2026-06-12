import { Department, Designation } from '../models';
import { sendSuccess } from '../utils/responseHelper';
import { AppError } from '../middleware/errorHandler';

class AdminOrgController {
  async listDepartments(req, res, next) {
    try {
      const depts = await Department.find().sort({ name: 1 });
      sendSuccess(res, depts, 'Departments fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async listDesignations(req, res, next) {
    try {
      const { departmentId } = req.query;
      const filter = departmentId ? { departmentId } : {};
      const designations = await Designation.find(filter).sort({ title: 1 });
      sendSuccess(res, designations, 'Designations fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminOrgController();
