const { Project } = require('../models');

/**
 * ProjectRepository — Data Access Layer for Project model.
 *
 * Handles project CRUD and embedded milestone operations.
 */
class ProjectRepository {
  async findAll(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.managerId) {
      query.managerId = filters.managerId;
    }

    return Project.find(query)
      .populate('managerId', 'fullName username')
      .sort({ createdAt: -1 });
  }

  async findById(id) {
    return Project.findById(id).populate('managerId', 'fullName username');
  }

  async findByManagerId(managerId) {
    return Project.find({ managerId }).sort({ createdAt: -1 });
  }

  async create(data) {
    const project = new Project(data);
    return project.save();
  }

  async update(id, data) {
    return Project.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('managerId', 'fullName username');
  }

  /**
   * Add a milestone to a project's milestones array.
   */
  async addMilestone(projectId, milestone) {
    return Project.findByIdAndUpdate(
      projectId,
      { $push: { milestones: milestone } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update a specific milestone's status.
   */
  async updateMilestoneStatus(projectId, milestoneId, status) {
    return Project.findOneAndUpdate(
      { _id: projectId, 'milestones._id': milestoneId },
      { $set: { 'milestones.$.status': status } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update project health status (used by scheduler).
   */
  async updateHealthStatus(projectId, healthStatus) {
    return Project.findByIdAndUpdate(
      projectId,
      { healthStatus },
      { new: true }
    );
  }

  /**
   * Find all active projects for health flagging by scheduler.
   */
  async findActiveProjects() {
    return Project.find({ status: 'ACTIVE' });
  }
}

module.exports = new ProjectRepository();
