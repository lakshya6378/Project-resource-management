import { Document, Types } from 'mongoose';

// User Interface
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  roleId: Types.ObjectId | Record<string, any>; // Support populated or unpopulated
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Role Interface
export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  isSystem?: boolean;
}

// Permission Interface
export interface IPermission extends Document {
  _id: Types.ObjectId;
  code: string;
  description: string;
}

// RolePermission Mapping
export interface IRolePermission extends Document {
  _id: Types.ObjectId;
  roleId: Types.ObjectId | IRole;
  permissionId: Types.ObjectId | IPermission;
}

// Department Interface
export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
}

// Designation Interface
export interface IDesignation extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
}

// EmployeeProfile Interface
export interface IEmployeeProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  firstName: string;
  lastName: string;
  fullName: string;
  departmentId: Types.ObjectId | IDepartment;
  designationId: Types.ObjectId | IDesignation;
  joiningDate: Date;
  managerId?: Types.ObjectId | IEmployeeProfile;
  isActive: boolean;
}

// ResourceProfile (Employee mapping with utilization)
export interface IResourceProfile extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId | IEmployeeProfile;
  currentUtilisation: number;
  skills: Types.ObjectId[];
  isActive: boolean;
}

// Project Interface
export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  managerId?: Types.ObjectId | IUser; // Typically the manager's User ID or Employee Profile
  status: 'UPCOMING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  milestones: any[]; // Add specifics if needed
  health: {
    status: 'GREEN' | 'YELLOW' | 'RED';
    lastUpdated: Date;
    remarks?: string;
  };
}

// Allocation Interface
export interface IAllocation extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId | IProject;
  resourceId: Types.ObjectId | IEmployeeProfile;
  allocatedPercentage: number;
  fromDate: Date;
  toDate: Date;
  isActive: boolean;
}

// Timesheet Entry
export interface ITimesheetEntry {
  projectId: Types.ObjectId | IProject;
  taskDescription: string;
  hours: number[]; // e.g. [8,8,8,8,8,0,0]
  totalHours: number;
}

// Timesheet Interface
export interface ITimesheet extends Document {
  _id: Types.ObjectId;
  resourceId: Types.ObjectId | IEmployeeProfile;
  weekStart: Date;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'MISSED' | 'FROZEN';
  entries: ITimesheetEntry[];
  totalHours: number;
  managerComment?: string;
  accessRequest?: {
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    reason?: string;
    requestedAt?: Date;
    resolvedAt?: Date;
  };
}

// SystemConfig Interface
export interface ISystemConfig extends Document {
  _id: Types.ObjectId;
  llmProvider: 'GEMINI' | 'GROQ' | 'LOCAL_GEMMA';
  llmApiKey: string;
  maxWeeklyHours: number;
  schedulerIntervalHours: number;
  updatedBy?: Types.ObjectId | IUser;
}
