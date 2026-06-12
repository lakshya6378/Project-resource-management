import projectService from '../../../src/services/ProjectService';
import { projectRepository, userRepository } from '../../../src/repositories';
import { PROJECT_STATUS, ROLES, MILESTONE_STATUS, HEALTH_STATUS } from '../../../src/config/constants';
import Allocation from '../../../src/models/Allocation';
import Timesheet from '../../../src/models/Timesheet';

jest.mock('../../../src/repositories', () => ({
  projectRepository: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    addMilestone: jest.fn(),
    updateMilestoneStatus: jest.fn(),
  },
  userRepository: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../src/models/ping', () => ({}), { virtual: true });

jest.mock('../../../src/models/Allocation', () => ({
  find: jest.fn()  
}));
jest.mock('../../../src/models/Timesheet', () => ({
  find: jest.fn()
}));

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should throw error if manager not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(projectService.createProject({ name: 'P1', managerId: 'm1', startDate: '2026-01-01', endDate: '2026-12-31' }))
        .rejects.toThrow('Manager not found');
    });

    it('should throw error if user is not a manager', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({ roleId: { name: 'EMPLOYEE' }, isActive: true });
      await expect(projectService.createProject({ name: 'P1', managerId: 'm1', startDate: '2026-01-01', endDate: '2026-12-31' }))
        .rejects.toThrow('Selected user is not a Manager');
    });

    it('should create project successfully', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({ roleId: { name: ROLES.MANAGER }, isActive: true });
      (projectRepository.create as jest.Mock).mockResolvedValue({_id: 'p1', name: 'P1' });

      const result = await projectService.createProject({
        name: 'P1', managerId: 'm1', startDate: '2026-01-01', endDate: '2026-12-31'
      });

      expect(result.name).toBe('P1');
      expect(projectRepository.create).toHaveBeenCalled();
    });
  });

  describe('listProjects', () => {
    it('should return projects with health status', async () => {
      const mockProjects = [
        { _id: 'p1', toObject: () => ({ _id: 'p1', name: 'P1' }), milestones: [
          { status: MILESTONE_STATUS.NOT_STARTED, dueDate: '2000-01-01', title: 'M1' }
        ] }
      ];
      (projectRepository.findAll as jest.Mock).mockResolvedValue(mockProjects);
      (Allocation.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      const result = await projectService.listProjects();

      expect(result[0].healthStatus).toBe(HEALTH_STATUS.ATTENTION);
      expect(result[0].riskFlags.length).toBeGreaterThan(0);
    });
  });

  describe('updateProject', () => {
    it('should throw error if project not found', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(projectService.updateProject('p1', { name: 'P2' }))
        .rejects.toThrow('Project not found');
    });

    it('should update project successfully', async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        _id: 'p1', startDate: '2026-01-01', endDate: '2026-12-31'
      });
      (projectRepository.update as jest.Mock).mockResolvedValue({ _id: 'p1', name: 'P2' });

      const result = await projectService.updateProject('p1', { name: 'P2' });
      expect(result.name).toBe('P2');
    });
  });

  describe('addMilestone', () => {
    it('should add milestone successfully', async () => {
      (projectRepository.findById as jest.Mock)
        .mockResolvedValue({ startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), milestones: [] });
      (projectRepository.addMilestone as jest.Mock).mockResolvedValue({ milestones: [{ title: 'M1' }] });

      const result = await projectService.addMilestone('p1', { title: 'M1', dueDate: '2026-05-05' });
      expect(result[0].title).toBe('M1');
    });
  });

  describe('updateMilestoneStatus', () => {
    it('should update milestone status', async () => {
      const mockProject = {
        milestones: {
          id: jest.fn().mockReturnValue({ _id: 'm1', status: 'NOT_STARTED' })
        }
      };
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (projectRepository.updateMilestoneStatus as jest.Mock).mockResolvedValue({ milestones: [{ _id: 'm1', status: 'DONE' }] });

      const result = await projectService.updateMilestoneStatus('p1', 'm1', 'DONE');
      expect(result[0].status).toBe('DONE');
    });
  });
});
