import { AppError } from '../middleware/errorHandler';
import Allocation from '../models/Allocation';
import Project from '../models/Project';
import ResourceProfile from '../models/ResourceProfile';
import EmployeeProfile from '../models/EmployeeProfile';

class AllocationService {
  async createAllocation(dto: any, managerId: string) {
    const { employeeId, projectId, utilisation, fromDate, toDate } = dto;
    
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found', 404);
    if (project.managerId.toString() !== managerId.toString()) {
      throw new AppError('You are not authorized to allocate to this project', 403);
    }
    if (project.status !== 'ACTIVE' && project.status !== 'PLANNED') {
      throw new AppError('Can only allocate to active or planned projects', 400);
    }
    
    const overlapping = await Allocation.find({
      resourceId: employeeId,
      isActive: true,
      $or: [
        { fromDate: { $lte: new Date(toDate) }, toDate: { $gte: new Date(fromDate) } }
      ]
    });
    
    const totalUtil = overlapping.reduce((sum, a) => sum + (a.utilisation || 0), 0);
    if (totalUtil + utilisation > 100) {
      throw new AppError(`Over-allocation: resource is already at ${totalUtil}% utilisation during this period`, 400);
    }
    
    const allocation = await Allocation.create({
      resourceId: employeeId,
      projectId,
      managerId,
      utilisation,
      fromDate,
      toDate,
      isActive: true
    });
    
    await this._updateResourceCurrentUtilisation(employeeId);
    return allocation;
  }

  async endAllocation(allocationId: string, managerId: string) {
    const alloc = await Allocation.findById(allocationId);
    if (!alloc) throw new AppError('Allocation not found', 404);
    if (alloc.managerId.toString() !== managerId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    alloc.isActive = false;
    alloc.toDate = new Date();
    await alloc.save();
    
    await this._updateResourceCurrentUtilisation(alloc.resourceId.toString());
    return { message: 'Allocation ended successfully' };
  }

  async listByProject(projectId: string, managerId: string) {
    const allocs = await Allocation.find({ projectId })
      .populate('resourceId', 'fullName email username')
      .lean();
      
    const resourceIds = allocs.map(a => (a.resourceId as any)._id);
    const profiles = await EmployeeProfile.find({ _id: { $in: resourceIds } })
      .populate('departmentId', 'name')
      .lean();
      
    const deptMap: any = {};
    profiles.forEach(p => {
      deptMap[p._id.toString()] = (p.departmentId as any)?.name || 'N/A';
    });

    return allocs.map(a => ({
      ...a,
      employeeId: {
        _id: (a.resourceId as any)._id,
        fullName: (a.resourceId as any).fullName,
        department: deptMap[(a.resourceId as any)._id.toString()] || 'N/A'
      }
    }));
  }

  async listByEmployee(employeeId: string) {
    return await Allocation.find({ resourceId: employeeId })
      .populate('projectId', 'name status')
      .sort({ fromDate: -1 });
  }

  async listAllAllocations() {
    return await Allocation.find()
      .populate({ path: 'resourceId', select: 'fullName email username' })
      .populate({ path: 'projectId', select: 'name status' })
      .populate({ path: 'managerId', select: 'fullName email' })
      .sort({ fromDate: -1 });
  }

  async _updateResourceCurrentUtilisation(resourceId: string) {
    const today = new Date();
    const activeAllocations = await Allocation.find({
      resourceId,
      isActive: true,
      fromDate: { $lte: today },
      toDate: { $gte: today }
    });
    const currentUtil = activeAllocations.reduce((sum, a) => sum + (a.utilisation || 0), 0);
    const status = currentUtil === 0 ? 'BENCH' : 'ALLOCATED';
    
    await ResourceProfile.findOneAndUpdate(
      { _id: resourceId },
      { currentUtilisation: currentUtil, status },
      { new: true }
    );
  }
}

export default new AllocationService();
