import adminSkillsController from '../../../src/controllers/AdminSkillsController';
import { SkillCategory, Skill } from '../../../src/models';
import { sendSuccess } from '../../../src/utils/responseHelper';
import { AppError } from '../../../src/middleware/errorHandler';

jest.mock('../../../src/utils/responseHelper');
jest.mock('../../../src/models', () => ({
  SkillCategory: {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  },
  Skill: {
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

describe('AdminSkillsController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createSkillCategory', () => {
    it('should call next with error if name is missing', async () => {
      await adminSkillsController.createSkillCategory(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].message).toBe('Category name is required');
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });

    it('should call next with error if category exists', async () => {
      mockReq.body.name = 'Frontend';
      (SkillCategory.findOne as jest.Mock).mockResolvedValue({ name: 'Frontend' });

      await adminSkillsController.createSkillCategory(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].message).toBe('Skill category already exists');
      expect(mockNext.mock.calls[0][0].statusCode).toBe(409);
    });

    it('should create category and send success', async () => {
      mockReq.body.name = 'Frontend';
      (SkillCategory.findOne as jest.Mock).mockResolvedValue(null);
      const mockCategory = { name: 'Frontend' };
      (SkillCategory.create as jest.Mock).mockResolvedValue(mockCategory);

      await adminSkillsController.createSkillCategory(mockReq, mockRes, mockNext);

      expect(SkillCategory.create).toHaveBeenCalledWith({ name: 'Frontend' });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCategory, 'Skill category created successfully', 201);
    });
  });

  describe('listSkillCategories', () => {
    it('should list categories and send success', async () => {
      const mockCategories = [{ name: 'Frontend' }];
      (SkillCategory.find().sort as jest.Mock).mockResolvedValue(mockCategories);

      await adminSkillsController.listSkillCategories(mockReq, mockRes, mockNext);

      expect(SkillCategory.find).toHaveBeenCalled();
      expect(SkillCategory.find().sort).toHaveBeenCalledWith({ name: 1 });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCategories, 'Skill categories fetched successfully');
    });

    it('should call next with error if find throws', async () => {
      const error = new Error('DB Error');
      (SkillCategory.find().sort as jest.Mock).mockRejectedValue(error);

      await adminSkillsController.listSkillCategories(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createSkill', () => {
    it('should call next with error if name or categoryId is missing', async () => {
      await adminSkillsController.createSkill(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].message).toBe('Name and categoryId are required');
    });

    it('should call next with error if category does not exist', async () => {
      mockReq.body = { name: 'React', categoryId: 'cat_1' };
      (SkillCategory.findById as jest.Mock).mockResolvedValue(null);

      await adminSkillsController.createSkill(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].message).toBe('Invalid category ID');
    });

    it('should call next with error if skill already exists', async () => {
      mockReq.body = { name: 'React', categoryId: 'cat_1' };
      (SkillCategory.findById as jest.Mock).mockResolvedValue({ id: 'cat_1' });
      (Skill.findOne as jest.Mock).mockResolvedValue({ name: 'React' });

      await adminSkillsController.createSkill(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].message).toBe('Skill already exists');
    });

    it('should create skill and send success', async () => {
      mockReq.body = { name: 'React', categoryId: 'cat_1' };
      (SkillCategory.findById as jest.Mock).mockResolvedValue({ id: 'cat_1' });
      (Skill.findOne as jest.Mock).mockResolvedValue(null);
      const mockSkill = { name: 'React', categoryId: 'cat_1' };
      (Skill.create as jest.Mock).mockResolvedValue(mockSkill);

      await adminSkillsController.createSkill(mockReq, mockRes, mockNext);

      expect(Skill.create).toHaveBeenCalledWith({ name: 'React', categoryId: 'cat_1' });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockSkill, 'Skill created successfully', 201);
    });
  });

  describe('listSkills', () => {
    it('should list skills and send success', async () => {
      const mockSkills = [{ name: 'React' }];
      (Skill.find().populate('categoryId').sort as jest.Mock).mockResolvedValue(mockSkills);

      await adminSkillsController.listSkills(mockReq, mockRes, mockNext);

      expect(Skill.find).toHaveBeenCalled();
      expect(Skill.find().populate).toHaveBeenCalledWith('categoryId');
      expect(Skill.find().populate('categoryId').sort).toHaveBeenCalledWith({ name: 1 });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockSkills, 'Skills fetched successfully');
    });

    it('should call next with error if find throws', async () => {
      const error = new Error('DB Error');
      (Skill.find().populate('categoryId').sort as jest.Mock).mockRejectedValue(error);

      await adminSkillsController.listSkills(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
