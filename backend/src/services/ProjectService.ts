import { projectRepository, userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { PROJECT_STATUS, ROLES, MILESTONE_STATUS } from '../config/constants';

/**
 * ProjectService — Admin Project Management
 *
 * Handles creating, updating, listing projects, and managing milestones.
 * Only accessible by Admins.
 *
 * Project lifecycle:
 *   PLANNED → ACTIVE → ON_HOLD / COMPLETED
 *   Health status (ON_TRACK / ATTENTION / AT_RISK) is set by the scheduler.
 */
class ProjectService {
  /**
   * Create a new project.
   *
   * Business rules:
   *   - managerId must reference a user with MANAGER role
   *   - startDate must be before endDate
   *   - New projects start as PLANNED with ON_TRACK health
   *
   * @param {Object} dto - { name, description, managerId, startDate, endDate }
   */
  async createProject(dto) {
    const { name, description, managerId, startDate, endDate } = dto;

    // Verify manager exists and has MANAGER role
    const manager = await userRepository.findById(managerId);
    if (!manager) {
      throw new AppError('Manager not found', 404);
    }
    if (manager.role !== ROLES.MANAGER) {
      throw new AppError('Selected user is not a Manager', 400);
    }
    if (!manager.isActive) {
      throw new AppError('Selected manager account is inactive', 400);
    }

    // Date validation (also done at schema level, but explicit here)
    if (new Date(startDate) >= new Date(endDate)) {
      throw new AppError('Start date must be before end date', 400);
    }

    const project = await projectRepository.create({
      name,
      description: description || '',
      managerId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: PROJECT_STATUS.PLANNED,
    });

    return project;
  }

  /**
   * List all projects with optional filters.
   *
   * @param {Object} filters - { status?, managerId? }
   */
  async listProjects(filters = {}) {
    const projects = await projectRepository.findAll(filters);
    return projects;
  }

  /**
   * Get a single project by ID (with populated manager).
   */
  async getProjectById(id) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new AppError('Project not found', 404);
    }
    return project;
  }

  /**
   * Update project details.
   *
   * Allowed fields: name, description, managerId, startDate, endDate, status
   *
   * @param {string} id - Project ID
   * @param {Object} dto - Fields to update
   */
  async updateProject(id, dto) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const allowedFields = ['name', 'description', 'managerId', 'startDate', 'endDate', 'status'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    // If changing manager, validate the new manager
    if (updateData.managerId) {
      const manager = await userRepository.findById(updateData.managerId);
      if (!manager) throw new AppError('Manager not found', 404);
      if (manager.role !== ROLES.MANAGER) throw new AppError('Selected user is not a Manager', 400);
    }

    // If changing dates, validate range
    const newStart = updateData.startDate ? new Date(updateData.startDate) : project.startDate;
    const newEnd = updateData.endDate ? new Date(updateData.endDate) : project.endDate;
    if (newStart >= newEnd) {
      throw new AppError('Start date must be before end date', 400);
    }

    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    const updated = await projectRepository.update(id, updateData);
    return updated;
  }

  // ─── Milestone Management ──────────────────────────────────

  /**
   * Add a milestone to a project.
   *
   * @param {string} projectId
   * @param {Object} milestone - { title, dueDate }
   */
  async addMilestone(projectId, milestone) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Validate due date is within project range
    const dueDate = new Date(milestone.dueDate);
    if (dueDate < project.startDate || dueDate > project.endDate) {
      throw new AppError('Milestone due date must be within project date range', 400);
    }

    // Check for duplicate milestone title
    const duplicate = project.milestones.find(
      (m) => m.title.toLowerCase() === milestone.title.toLowerCase()
    );
    if (duplicate) {
      throw new AppError(`Milestone '${milestone.title}' already exists`, 409);
    }

    const updated = await projectRepository.addMilestone(projectId, {
      title: milestone.title,
      dueDate,
      status: MILESTONE_STATUS.NOT_STARTED,
    });

    return updated.milestones;
  }

  /**
   * Update a milestone's status.
   *
   * @param {string} projectId
   * @param {string} milestoneId
   * @param {string} status - NOT_STARTED / IN_PROGRESS / DONE
   */
  async updateMilestoneStatus(projectId, milestoneId, status) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) {
      throw new AppError('Milestone not found', 404);
    }

    if (!Object.values(MILESTONE_STATUS).includes(status)) {
      throw new AppError(`Invalid status: ${status}`, 400);
    }

    const updated = await projectRepository.updateMilestoneStatus(projectId, milestoneId, status);
    return updated.milestones;
  }
}

export default new ProjectService();
