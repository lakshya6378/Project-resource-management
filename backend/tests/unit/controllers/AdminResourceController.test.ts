import adminResourceController from '../../../src/controllers/AdminResourceController';
import resourceService from '../../../src/services/ResourceService';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/services/ResourceService');
jest.mock('../../../src/utils/responseHelper');

describe('AdminResourceController', () => {
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

  describe('createEmployee', () => {
    it('should call resourceService.createEmployee and send success response', async () => {
      mockReq.body = { userId: '1' };
      const mockResult = { employeeProfile: {}, resourceProfile: {} };
      (resourceService.createEmployee as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.createEmployee(mockReq, mockRes, mockNext);

      expect(resourceService.createEmployee).toHaveBeenCalledWith(mockReq.body);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Resource profile created successfully', 201);
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Creation failed');
      (resourceService.createEmployee as jest.Mock).mockRejectedValue(error);

      await adminResourceController.createEmployee(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listEmployees', () => {
    it('should pass filters to service and send success response', async () => {
      mockReq.query = { status: 'BENCH', department: 'Engineering' };
      const mockResult = { employees: [], counts: {} };
      (resourceService.listEmployees as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.listEmployees(mockReq, mockRes, mockNext);

      expect(resourceService.listEmployees).toHaveBeenCalledWith({ status: 'BENCH', department: 'Engineering' });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Resources retrieved successfully');
    });

    it('should pass empty filters if no query params', async () => {
      mockReq.query = {};
      const mockResult = { employees: [], counts: {} };
      (resourceService.listEmployees as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.listEmployees(mockReq, mockRes, mockNext);

      expect(resourceService.listEmployees).toHaveBeenCalledWith({});
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Resources retrieved successfully');
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Listing failed');
      (resourceService.listEmployees as jest.Mock).mockRejectedValue(error);

      await adminResourceController.listEmployees(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getEmployee', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      const mockResult = { _id: '1' };
      (resourceService.getEmployeeById as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.getEmployee(mockReq, mockRes, mockNext);

      expect(resourceService.getEmployeeById).toHaveBeenCalledWith('1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Resource retrieved successfully');
    });

    it('should call next with error if service throws', async () => {
      mockReq.params.id = '1';
      const error = new Error('Get failed');
      (resourceService.getEmployeeById as jest.Mock).mockRejectedValue(error);

      await adminResourceController.getEmployee(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateEmployee', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      mockReq.body = { departmentId: '2' };
      const mockResult = { _id: '1', departmentId: '2' };
      (resourceService.updateEmployee as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.updateEmployee(mockReq, mockRes, mockNext);

      expect(resourceService.updateEmployee).toHaveBeenCalledWith('1', mockReq.body);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Resource updated successfully');
    });

    it('should call next with error if service throws', async () => {
      mockReq.params.id = '1';
      const error = new Error('Update failed');
      (resourceService.updateEmployee as jest.Mock).mockRejectedValue(error);

      await adminResourceController.updateEmployee(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deactivateEmployee', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      const mockResult = { _id: '1' };
      (resourceService.deactivateEmployee as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.deactivateEmployee(mockReq, mockRes, mockNext);

      expect(resourceService.deactivateEmployee).toHaveBeenCalledWith('1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Resource deactivated successfully');
    });

    it('should call next with error if service throws', async () => {
      mockReq.params.id = '1';
      const error = new Error('Deactivate failed');
      (resourceService.deactivateEmployee as jest.Mock).mockRejectedValue(error);

      await adminResourceController.deactivateEmployee(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('assignManager', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      mockReq.body = { managerId: '2' };
      const mockResult = { _id: '1' };
      (resourceService.assignManager as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.assignManager(mockReq, mockRes, mockNext);

      expect(resourceService.assignManager).toHaveBeenCalledWith('1', '2');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Manager assigned successfully');
    });

    it('should call next with error if service throws', async () => {
      mockReq.params.id = '1';
      const error = new Error('Assign failed');
      (resourceService.assignManager as jest.Mock).mockRejectedValue(error);

      await adminResourceController.assignManager(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // Skills endpoints
  describe('getSkills', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      const mockResult = [];
      (resourceService.getSkills as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.getSkills(mockReq, mockRes, mockNext);

      expect(resourceService.getSkills).toHaveBeenCalledWith('1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Skills retrieved successfully');
    });
  });

  describe('addSkill', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      mockReq.body = { skillId: 's1' };
      const mockResult = [];
      (resourceService.addSkill as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.addSkill(mockReq, mockRes, mockNext);

      expect(resourceService.addSkill).toHaveBeenCalledWith('1', mockReq.body);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Skill added successfully', 201);
    });
  });

  describe('updateSkillProficiency', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      mockReq.params.skillId = 's1';
      mockReq.body = { proficiency: 3 };
      const mockResult = [];
      (resourceService.updateSkillProficiency as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.updateSkillProficiency(mockReq, mockRes, mockNext);

      expect(resourceService.updateSkillProficiency).toHaveBeenCalledWith('1', 's1', 3);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Skill proficiency updated successfully');
    });
  });

  describe('removeSkill', () => {
    it('should call service and send success response', async () => {
      mockReq.params.id = '1';
      mockReq.params.skillId = 's1';
      const mockResult = [];
      (resourceService.removeSkill as jest.Mock).mockResolvedValue(mockResult);

      await adminResourceController.removeSkill(mockReq, mockRes, mockNext);

      expect(resourceService.removeSkill).toHaveBeenCalledWith('1', 's1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Skill removed successfully');
    });
  });
});
