import adminProjectController from '../../../src/controllers/AdminProjectController';
import projectService from '../../../src/services/ProjectService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/ProjectService');
jest.mock('../../../src/utils/responseHelper');

describe('AdminProjectController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createProject', () => {
    it('should call projectService.createProject and send success response', async () => {
      mockReq.body = { name: 'New Project' };
      const mockProject = { id: 'proj_1', name: 'New Project' };
      (projectService.createProject as jest.Mock).mockResolvedValue(mockProject);

      await adminProjectController.createProject(mockReq, mockRes, mockNext);

      expect(projectService.createProject).toHaveBeenCalledWith(mockReq.body);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockProject, 'Project created successfully', 201);
    });

    it('should call next with error if projectService.createProject throws', async () => {
      const error = new Error('Creation failed');
      (projectService.createProject as jest.Mock).mockRejectedValue(error);

      await adminProjectController.createProject(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listProjects', () => {
    it('should fetch projects and send success response', async () => {
      const mockProjects = [{ id: 'proj_1' }];
      (projectService.listProjects as jest.Mock).mockResolvedValue(mockProjects);

      await adminProjectController.listProjects(mockReq, mockRes, mockNext);

      expect(projectService.listProjects).toHaveBeenCalledWith({});
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockProjects, 'Projects retrieved successfully');
    });

    it('should apply filters when query params are provided', async () => {
      mockReq.query = { status: 'ACTIVE', managerId: 'mgr_1' };
      const mockProjects = [{ id: 'proj_1' }];
      (projectService.listProjects as jest.Mock).mockResolvedValue(mockProjects);

      await adminProjectController.listProjects(mockReq, mockRes, mockNext);

      expect(projectService.listProjects).toHaveBeenCalledWith({ status: 'ACTIVE', managerId: 'mgr_1' });
    });

    it('should call next with error if projectService.listProjects throws', async () => {
      const error = new Error('Database error');
      (projectService.listProjects as jest.Mock).mockRejectedValue(error);

      await adminProjectController.listProjects(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getProject', () => {
    it('should fetch project and send success response', async () => {
      mockReq.params.id = 'proj_1';
      const mockProject = { id: 'proj_1' };
      (projectService.getProjectById as jest.Mock).mockResolvedValue(mockProject);

      await adminProjectController.getProject(mockReq, mockRes, mockNext);

      expect(projectService.getProjectById).toHaveBeenCalledWith('proj_1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockProject, 'Project retrieved successfully');
    });

    it('should call next with error if projectService.getProjectById throws', async () => {
      const error = new Error('Not found');
      (projectService.getProjectById as jest.Mock).mockRejectedValue(error);

      await adminProjectController.getProject(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateProject', () => {
    it('should update project and send success response', async () => {
      mockReq.params.id = 'proj_1';
      mockReq.body = { name: 'Updated' };
      const mockProject = { id: 'proj_1', name: 'Updated' };
      (projectService.updateProject as jest.Mock).mockResolvedValue(mockProject);

      await adminProjectController.updateProject(mockReq, mockRes, mockNext);

      expect(projectService.updateProject).toHaveBeenCalledWith('proj_1', mockReq.body);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockProject, 'Project updated successfully');
    });

    it('should call next with error if projectService.updateProject throws', async () => {
      const error = new Error('Update failed');
      (projectService.updateProject as jest.Mock).mockRejectedValue(error);

      await adminProjectController.updateProject(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('addMilestone', () => {
    it('should add milestone and send success response', async () => {
      mockReq.params.id = 'proj_1';
      mockReq.body = { title: 'M1' };
      const mockMilestones = [{ title: 'M1' }];
      (projectService.addMilestone as jest.Mock).mockResolvedValue(mockMilestones);

      await adminProjectController.addMilestone(mockReq, mockRes, mockNext);

      expect(projectService.addMilestone).toHaveBeenCalledWith('proj_1', mockReq.body);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockMilestones, 'Milestone added successfully', 201);
    });

    it('should call next with error if projectService.addMilestone throws', async () => {
      const error = new Error('Failed');
      (projectService.addMilestone as jest.Mock).mockRejectedValue(error);

      await adminProjectController.addMilestone(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateMilestoneStatus', () => {
    it('should update milestone status and send success response', async () => {
      mockReq.params.id = 'proj_1';
      mockReq.params.milestoneId = 'm_1';
      mockReq.body = { status: 'COMPLETED' };
      const mockMilestones = [{ id: 'm_1', status: 'COMPLETED' }];
      (projectService.updateMilestoneStatus as jest.Mock).mockResolvedValue(mockMilestones);

      await adminProjectController.updateMilestoneStatus(mockReq, mockRes, mockNext);

      expect(projectService.updateMilestoneStatus).toHaveBeenCalledWith('proj_1', 'm_1', 'COMPLETED');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockMilestones, 'Milestone status updated successfully');
    });

    it('should call next with error if projectService.updateMilestoneStatus throws', async () => {
      const error = new Error('Failed');
      (projectService.updateMilestoneStatus as jest.Mock).mockRejectedValue(error);

      await adminProjectController.updateMilestoneStatus(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
