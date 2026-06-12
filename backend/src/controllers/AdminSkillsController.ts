import { SkillCategory, Skill } from '../models';
import { sendSuccess } from '../utils/responseHelper';
import { AppError } from '../middleware/errorHandler';

class AdminSkillsController {
  // ─── Skill Categories ───────────────────────────────────────

  async createSkillCategory(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) throw new AppError('Category name is required', 400);

      const existing = await SkillCategory.findOne({ name });
      if (existing) throw new AppError('Skill category already exists', 409);

      const category = await SkillCategory.create({ name });
      sendSuccess(res, category, 'Skill category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listSkillCategories(req, res, next) {
    try {
      const categories = await SkillCategory.find().sort({ name: 1 });
      sendSuccess(res, categories, 'Skill categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Skills ─────────────────────────────────────────────────

  async createSkill(req, res, next) {
    try {
      const { name, categoryId } = req.body;
      if (!name || !categoryId) throw new AppError('Name and categoryId are required', 400);

      const category = await SkillCategory.findById(categoryId);
      if (!category) throw new AppError('Invalid category ID', 400);

      const existing = await Skill.findOne({ name });
      if (existing) throw new AppError('Skill already exists', 409);

      const skill = await Skill.create({ name, categoryId });
      sendSuccess(res, skill, 'Skill created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listSkills(req, res, next) {
    try {
      const skills = await Skill.find().populate('categoryId').sort({ name: 1 });
      sendSuccess(res, skills, 'Skills fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminSkillsController();
