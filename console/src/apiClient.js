const axios = require('axios');

/**
 * API Client — HTTP wrapper for the PRM Tool backend.
 *
 * Manages the base URL, JWT token, and provides typed methods
 * for every backend endpoint. All methods return the API response data.
 *
 * Usage:
 *   const api = require('./apiClient');
 *   api.setToken(token);
 *   const users = await api.listUsers();
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Axios instance with defaults
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
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
      err.statusCode = error.response.status;
      err.errors = error.response.data?.errors || [];
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

const deactivateUser = (id) => client.patch(`/admin/users/${id}/deactivate`);

const reactivateUser = (id) => client.patch(`/admin/users/${id}/reactivate`);

const resetPassword = (id, tempPassword) =>
  client.post(`/admin/users/${id}/reset-password`, { tempPassword });

// ═══════════════════════════════════════════════════════════════
// ADMIN — EMPLOYEE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const createEmployee = (data) => client.post('/admin/employees', data);

const listEmployees = (params = {}) => client.get('/admin/employees', { params });

const getEmployee = (id) => client.get(`/admin/employees/${id}`);

const updateEmployee = (id, data) => client.put(`/admin/employees/${id}`, data);

const deactivateEmployee = (id) => client.patch(`/admin/employees/${id}/deactivate`);

// ─── Skills ──────────────────────────────────────────────────

const getSkills = (employeeId) => client.get(`/admin/employees/${employeeId}/skills`);

const addSkill = (employeeId, data) =>
  client.post(`/admin/employees/${employeeId}/skills`, data);

const updateSkillProficiency = (employeeId, skillId, proficiency) =>
  client.put(`/admin/employees/${employeeId}/skills/${skillId}`, { proficiency });

const removeSkill = (employeeId, skillId) =>
  client.delete(`/admin/employees/${employeeId}/skills/${skillId}`);

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
// ADMIN — SYSTEM CONFIG ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const getConfig = () => client.get('/admin/config');

const updateConfig = (data) => client.put('/admin/config', data);

module.exports = {
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
  deactivateUser,
  reactivateUser,
  resetPassword,
  // Admin - Employees
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  // Admin - Skills
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
  // Admin - Config
  getConfig,
  updateConfig,
};

