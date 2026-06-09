import { User } from '../models';

/**
 * UserRepository — Data Access Layer for User model.
 *
 * Repository Pattern: abstracts all database operations.
 * Controllers and services never call Mongoose directly.
 * This makes the business logic testable with mock repositories.
 */
class UserRepository {
  async findAll() {
    return User.find().select('-passwordHash').sort({ createdAt: -1 });
  }

  async findById(id) {
    return User.findById(id).select('-passwordHash');
  }

  /**
   * Find by ID including passwordHash.
   * Used only during authentication — never exposed to controllers.
   */
  async findByIdWithPassword(id) {
    return User.findById(id);
  }

  async findByUsername(username) {
    return User.findOne({ username: username.toLowerCase() });
  }

  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  async update(id, data) {
    return User.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,  // run schema validators on update
    }).select('-passwordHash');
  }

  async countByStatus() {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true });
    const inactive = total - active;
    return { total, active, inactive };
  }
}

export default new UserRepository();
