import { Employee } from '../models';

/**
 * EmployeeRepository — Data Access Layer for Employee model.
 *
 * Supports filtering by status and department for the Resource Dashboard
 * and Admin employee list views.
 */
class EmployeeRepository {
  async findAll(filters: any = {}) {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.department) {
      query.department = filters.department;
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    return Employee.find(query).sort({ createdAt: -1 });
  }

  async findById(id) {
    return Employee.findById(id);
  }

  async findByUserId(userId) {
    return Employee.findOne({ userId });
  }

  async create(data) {
    const employee = new Employee(data);
    return employee.save();
  }

  async update(id, data) {
    return Employee.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
    });
  }

  /**
   * Add a skill to an employee's skills array.
   */
  async addSkill(employeeId, skill) {
    return Employee.findByIdAndUpdate(
      employeeId,
      { $push: { skills: skill } },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Update a specific skill's proficiency level.
   */
  async updateSkill(employeeId, skillId, proficiency) {
    return Employee.findOneAndUpdate(
      { _id: employeeId, 'skills._id': skillId },
      { $set: { 'skills.$.proficiency': proficiency } },
      { returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Remove a skill from an employee's skills array.
   */
  async removeSkill(employeeId, skillId) {
    return Employee.findByIdAndUpdate(
      employeeId,
      { $pull: { skills: { _id: skillId } } },
      { returnDocument: 'after' }
    );
  }

  async countByStatus() {
    const total = await Employee.countDocuments({ isActive: true });
    const allocated = await Employee.countDocuments({ isActive: true, status: 'ALLOCATED' });
    const bench = await Employee.countDocuments({ isActive: true, status: 'BENCH' });
    return { total, allocated, bench };
  }

  /**
   * Bulk update utilisation and status for scheduler.
   * Accepts an array of { employeeId, utilisation, status }.
   */
  async bulkUpdateUtilisation(updates) {
    const bulkOps = updates.map((u) => ({
      updateOne: {
        filter: { _id: u.employeeId },
        update: { $set: { currentUtilisation: u.utilisation, status: u.status } },
      },
    }));

    if (bulkOps.length > 0) {
      return Employee.bulkWrite(bulkOps);
    }
    return null;
  }
}

export default new EmployeeRepository();
