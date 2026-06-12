import axios from 'axios';

/**
 * API Client — HTTP wrapper for the PRM Tool backend.
 *
 * Manages the base URL, JWT token, and provides typed methods
 * for every backend endpoint. All methods return the API response data.
 *
 * Usage:
 *   import api from './apiClient';
 *   api.setToken(token);
 *   const users = await api.listUsers();
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Axios instance with defaults
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token Management ────────────────────────────────────────
let authToken = null;

const setToken = (token) => {
  authToken = token;
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const getToken = () => authToken;

const clearToken = () => {
  authToken = null;
  delete client.defaults.headers.common['Authorization'];
};

// ─── Response Interceptor: extract data or throw ─────────────
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const msg = error.response.data?.message || 'Unknown error';
      const err = new Error(msg);
      (err as any).statusCode = error.response.status;
      (err as any).errors = error.response.data?.errors || [];
      throw err;
    }
    throw new Error(`Network error: ${error.message}`);
  }
);

// ═══════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const login = (username, password) =>
  client.post('/auth/login', { username, password });

const changePassword = (currentPassword, newPassword) =>
  client.post('/auth/change-password', { currentPassword, newPassword });

const logout = () => client.post('/auth/logout');

// ═══════════════════════════════════════════════════════════════
// ADMIN — USER ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const createUser = (data) => client.post('/admin/users', data);

const listUsers = () => client.get('/admin/users');

const listRoles = () => client.get('/admin/roles');

const deactivateUser = (id) => client.patch(`/admin/users/${id}/deactivate`);

const reactivateUser = (id) => client.patch(`/admin/users/${id}/reactivate`);

const resetPassword = (id, tempPassword) =>
  client.post(`/admin/users/${id}/reset-password`, { tempPassword });

// ═══════════════════════════════════════════════════════════════
// ADMIN — EMPLOYEE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const createEmployee = (data) => client.post('/admin/resources', data);

const listEmployees = (params = {}) => client.get('/admin/resources', { params });

const getEmployee = (id) => client.get(`/admin/resources/${id}`);

const updateEmployee = (id, data) => client.put(`/admin/resources/${id}`, data);

const deactivateEmployee = (id) => client.patch(`/admin/resources/${id}/deactivate`);

// ─── Skills ──────────────────────────────────────────────────

const getSkills = (employeeId) => client.get(`/admin/resources/${employeeId}/skills`);

const addSkill = (employeeId, data) =>
  client.post(`/admin/resources/${employeeId}/skills`, data);

const updateSkillProficiency = (employeeId, skillId, proficiency) =>
  client.put(`/admin/resources/${employeeId}/skills/${skillId}`, { proficiency });

const removeSkill = (employeeId, skillId) =>
  client.delete(`/admin/resources/${employeeId}/skills/${skillId}`);

// ═══════════════════════════════════════════════════════════════
// ADMIN — ORG & GLOBAL SKILLS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const listDepartments = () => client.get('/admin/departments');
const listDesignations = (departmentId?) => 
  client.get('/admin/designations', { params: departmentId ? { departmentId } : {} });

const listSkillCategories = () => client.get('/admin/skills/categories');
const createSkillCategory = (data) => client.post('/admin/skills/categories', data);

const listGlobalSkills = () => client.get('/admin/skills');
const createGlobalSkill = (data) => client.post('/admin/skills', data);

// ═══════════════════════════════════════════════════════════════
// ADMIN — PROJECT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const createProject = (data) => client.post('/admin/projects', data);

const listProjects = (params = {}) => client.get('/admin/projects', { params });

const getProject = (id) => client.get(`/admin/projects/${id}`);

const updateProject = (id, data) => client.put(`/admin/projects/${id}`, data);

// ─── Milestones ──────────────────────────────────────────────

const addMilestone = (projectId, data) =>
  client.post(`/admin/projects/${projectId}/milestones`, data);

const updateMilestoneStatus = (projectId, milestoneId, status) =>
  client.put(`/admin/projects/${projectId}/milestones/${milestoneId}`, { status });

// ═══════════════════════════════════════════════════════════════
// ADMIN — SYSTEM CONFIG & ALLOCATIONS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const listAllAllocations = () => client.get('/admin/allocations');

const getConfig = () => client.get('/admin/config');

const updateConfig = (data) => client.put('/admin/config', data);

const triggerScheduler = () => client.post('/admin/scheduler/trigger');

// ═══════════════════════════════════════════════════════════════
// MANAGER ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const createAllocation = (data) => client.post('/manager/allocations', data);

const endAllocation = (id) => client.delete(`/manager/allocations/${id}`);

const getProjectAllocations = (projectId) =>
  client.get(`/manager/projects/${projectId}/allocations`);

const getEmployeeAllocations = (employeeId) =>
  client.get(`/manager/employees/${employeeId}/allocations`);

const getTeamTimesheets = (weekStart) =>
  client.get('/manager/timesheets/team', { params: { weekStart } });

const suggestTeam = (projectId, requirements?: string) =>
  client.get(`/manager/projects/${projectId}/suggest-team`, { params: { requirements } });

const generateRiskSummary = (projectId) =>
  client.get(`/manager/projects/${projectId}/risk-summary`);

const teamSearch = (query) => client.get('/manager/ai/team-search', { params: { query } });

const reviewTimesheetAccess = (id, data) =>
  client.post(`/manager/timesheets/${id}/review-access`, data);

const getPendingTimesheetRequests = () =>
  client.get('/manager/timesheets/pending-requests');

const getTeamEmployees = () => client.get('/manager/employees');

const getMyManagerProjects = () => client.get('/manager/projects');

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const getMyAllocations = () => client.get('/employee/my-allocations');

const submitTimesheet = (data) => client.post('/employee/timesheets', data);

const getMyTimesheets = () => client.get('/employee/timesheets');

const getTimesheetByWeek = (weekStart) => client.get(`/employee/timesheets/${weekStart}`);

const requestTimesheetAccess = (data) => client.post('/employee/timesheets/access-request', data);

export default {
  // Token management
  setToken,
  getToken,
  clearToken,
  // Auth
  login,
  changePassword,
  logout,
  // Admin - Users
  createUser,
  listUsers,
  listRoles,
  deactivateUser,
  reactivateUser,
  resetPassword,
  // Admin - Employees
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  // Admin - Org & Global Skills
  listDepartments,
  listDesignations,
  listSkillCategories,
  createSkillCategory,
  listGlobalSkills,
  createGlobalSkill,
  // Admin - Employee Skills
  getSkills,
  addSkill,
  updateSkillProficiency,
  removeSkill,
  // Admin - Projects
  createProject,
  listProjects,
  getProject,
  updateProject,
  // Admin - Milestones
  addMilestone,
  updateMilestoneStatus,
  // Admin - Allocations
  listAllAllocations,
  // Admin - Config
  getConfig,
  updateConfig,
  triggerScheduler,
  // Manager
  createAllocation,
  endAllocation,
  getProjectAllocations,
  getEmployeeAllocations,
  getTeamTimesheets,
  suggestTeam,
  generateRiskSummary,
  teamSearch,
  reviewTimesheetAccess,
  getPendingTimesheetRequests,
  getTeamEmployees,
  getMyManagerProjects,
  // Employee
  getMyAllocations,
  submitTimesheet,
  getMyTimesheets,
  getTimesheetByWeek,
  requestTimesheetAccess,
};

