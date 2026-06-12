import { EmployeeProfile, ResourceProfile, User, Role, Department, Designation, EmployeeSkill } from '../models';
import { AppError } from '../middleware/errorHandler';
import { ROLES } from '../config/constants';
import { ERROR_MESSAGES } from '../config/errorMessages';

class ResourceService {
  async createEmployee(dto) {
    const { userId, departmentId, designationId } = dto;

    const user = await User.findById(userId).populate('roleId');
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, 404);

    const dept = await Department.findById(departmentId);
    if (!dept) throw new AppError(ERROR_MESSAGES.DEPT_NOT_FOUND, 404);

    const desig = await Designation.findById(designationId);
    if (!desig) throw new AppError(ERROR_MESSAGES.DESIG_NOT_FOUND, 404);

    const existingProfile = await EmployeeProfile.findById(userId);
    if (existingProfile) throw new AppError(ERROR_MESSAGES.EMP_PROFILE_EXISTS, 409);

    const employeeProfile = await EmployeeProfile.create({
      _id: userId,
      fullName: user.fullName,
      departmentId,
      designationId,
    });

    const roleName = (user.roleId as any).name;
    let resourceProfile = null;

    if (roleName === ROLES.EMPLOYEE) {
      resourceProfile = await ResourceProfile.create({
        _id: userId,
        status: 'BENCH',
        currentUtilisation: 0,
      });
    }

    return { employeeProfile, resourceProfile };
  }

  async listEmployees(filters: any = {}) {
    // ... logic remains
    let query: any = {};
    if (filters.department) {
      const dept = await Department.findOne({ name: filters.department });
      if (dept) {
        query.departmentId = dept._id;
      } else {
        query.departmentId = null; // Force empty result if department not found
      }
    }

    const profiles = await EmployeeProfile.find(query)
      .populate('_id', 'email username isActive')
      .populate('departmentId')
      .populate('designationId')
      .lean();

    let resourceQuery: any = {};
    if (filters.status) {
      resourceQuery.status = filters.status;
    }
    if (filters.managerId) {
      resourceQuery.managerId = filters.managerId;
    }

    const resourceProfiles = await ResourceProfile.find(resourceQuery).lean();
    const resourceMap = new Map(resourceProfiles.map(rp => [rp._id.toString(), rp]));

    const employees = profiles.map(p => {
      const userIdStr = (p._id as any)._id ? (p._id as any)._id.toString() : p._id.toString();
      const rp = resourceMap.get(userIdStr);
      if (!rp) return null; // Only include resources
      return {
        ...p,
        _id: userIdStr,
        email: (p._id as any).email,
        username: (p._id as any).username,
        isActive: (p._id as any).isActive,
        resourceData: rp || null
      };
    }).filter(Boolean);

    const counts = {
      total: employees.length,
      allocated: employees.filter(e => e.resourceData && e.resourceData.status === 'ALLOCATED').length,
      bench: employees.filter(e => e.resourceData && e.resourceData.status === 'BENCH').length,
    };

    return { employees, counts };
  }

  async getEmployeeById(id) {
    const profile = await EmployeeProfile.findById(id)
      .populate('_id', 'email username isActive')
      .populate('departmentId')
      .populate('designationId')
      .lean();

    if (!profile) throw new AppError(ERROR_MESSAGES.EMP_PROFILE_NOT_FOUND, 404);

    const resourceProfile = await ResourceProfile.findById(id).lean();
    const skills = await EmployeeSkill.find({ resourceId: id }).populate({
      path: 'skillId',
      populate: { path: 'categoryId' }
    });

    const userIdStr = (profile._id as any)._id ? (profile._id as any)._id.toString() : profile._id.toString();

    return { 
      ...profile, 
      _id: userIdStr,
      email: (profile._id as any).email,
      username: (profile._id as any).username,
      isActive: (profile._id as any).isActive,
      resourceData: resourceProfile, 
      skills 
    };
  }

  async updateEmployee(id, dto) {
    const { departmentId, designationId } = dto;
    let profile = await EmployeeProfile.findById(id);
    if (!profile) throw new AppError(ERROR_MESSAGES.EMP_PROFILE_NOT_FOUND, 404);

    if (departmentId) profile.departmentId = departmentId;
    if (designationId) profile.designationId = designationId;
    await profile.save();
    return profile;
  }

  async deactivateEmployee(id) {
    const user = await User.findById(id);
    if (!user) throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, 404);

    if (!user.isActive) throw new AppError('User is already inactive', 400);

    // Set User to inactive
    user.isActive = false;
    await user.save();

    // Set ResourceProfile to INACTIVE
    const resourceProfile = await ResourceProfile.findById(id);
    if (resourceProfile) {
      resourceProfile.status = 'INACTIVE';
      resourceProfile.currentUtilisation = 0;
      await resourceProfile.save();
    }

    // End all active allocations
    const { Allocation } = require('../models'); // Import locally if not at top
    const today = new Date();
    await Allocation.updateMany(
      { resourceId: id, toDate: { $gt: today } },
      { $set: { toDate: today } }
    );

    return { user, resourceProfile };
  }

  async assignManager(employeeId, managerId) {
    const resourceProfile = await ResourceProfile.findById(employeeId);
    if (!resourceProfile) throw new AppError(ERROR_MESSAGES.RESOURCE_PROFILE_NOT_FOUND, 404);

    const managerUser = await User.findById(managerId).populate('roleId');
    if (!managerUser || (managerUser.roleId as any).name !== ROLES.MANAGER) {
      throw new AppError(ERROR_MESSAGES.INVALID_MANAGER_ID, 400);
    }

    resourceProfile.managerId = managerId;
    await resourceProfile.save();
    return resourceProfile;
  }

  async getSkills(employeeId) {
    return EmployeeSkill.find({ resourceId: employeeId }).populate({
      path: 'skillId',
      populate: { path: 'categoryId' }
    });
  }

  async addSkill(employeeId, skillDto) {
    const { skillId, proficiency } = skillDto;
    const rp = await ResourceProfile.findById(employeeId);
    if (!rp) throw new AppError(ERROR_MESSAGES.RESOURCE_REQ_FOR_SKILL, 400);

    await EmployeeSkill.create({ resourceId: employeeId, skillId, proficiency: proficiency.toUpperCase() });
    return this.getSkills(employeeId);
  }

  async updateSkillProficiency(employeeId, skillId, proficiency) {
    const es = await EmployeeSkill.findOne({ resourceId: employeeId, skillId });
    if (!es) throw new AppError(ERROR_MESSAGES.SKILL_NOT_FOUND_EMP, 404);

    es.proficiency = proficiency.toUpperCase();
    await es.save();
    return this.getSkills(employeeId);
  }

  async removeSkill(employeeId, skillId) {
    await EmployeeSkill.findOneAndDelete({ resourceId: employeeId, skillId });
    return this.getSkills(employeeId);
  }
}

export default new ResourceService();
