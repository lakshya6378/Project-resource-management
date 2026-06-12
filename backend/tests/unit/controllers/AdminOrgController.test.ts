import adminOrgController from '../../../src/controllers/AdminOrgController';
import { Department, Designation } from '../../../src/models';
import { sendSuccess } from '../../../src/utils/responseHelper';

jest.mock('../../../src/utils/responseHelper');
jest.mock('../../../src/models', () => ({
  Department: {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn(),
  },
  Designation: {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn(),
  },
}));

describe('AdminOrgController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('listDepartments', () => {
    it('should fetch departments and send success response', async () => {
      const mockDepts = [{ name: 'Engineering' }];
      (Department.find().sort as jest.Mock).mockResolvedValue(mockDepts);

      await adminOrgController.listDepartments(mockReq, mockRes, mockNext);

      expect(Department.find).toHaveBeenCalled();
      expect(Department.find().sort).toHaveBeenCalledWith({ name: 1 });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockDepts, 'Departments fetched successfully');
    });

    it('should call next with error if Department.find throws', async () => {
      const error = new Error('Database error');
      (Department.find().sort as jest.Mock).mockRejectedValue(error);

      await adminOrgController.listDepartments(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listDesignations', () => {
    it('should fetch designations and send success response', async () => {
      const mockDesignations = [{ title: 'Developer' }];
      (Designation.find().sort as jest.Mock).mockResolvedValue(mockDesignations);

      await adminOrgController.listDesignations(mockReq, mockRes, mockNext);

      expect(Designation.find).toHaveBeenCalledWith({});
      expect(Designation.find().sort).toHaveBeenCalledWith({ title: 1 });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockDesignations, 'Designations fetched successfully');
    });

    it('should filter designations by departmentId', async () => {
      mockReq.query.departmentId = 'dept_1';
      const mockDesignations = [{ title: 'Developer' }];
      (Designation.find().sort as jest.Mock).mockResolvedValue(mockDesignations);

      await adminOrgController.listDesignations(mockReq, mockRes, mockNext);

      expect(Designation.find).toHaveBeenCalledWith({ departmentId: 'dept_1' });
    });

    it('should call next with error if Designation.find throws', async () => {
      const error = new Error('Database error');
      (Designation.find().sort as jest.Mock).mockRejectedValue(error);

      await adminOrgController.listDesignations(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
