const swaggerJsdoc = require('swagger-jsdoc');
const env = require('../config/env');

/**
 * Swagger / OpenAPI 3.0 Configuration
 *
 * Auto-generates API documentation from JSDoc annotations in route files.
 * Swagger UI is served at /api-docs for interactive testing.
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PRM Tool API',
      version: '1.0.0',
      description:
        'Project & Resource Management Tool — REST API documentation. ' +
        'Covers authentication, admin operations, manager operations, and employee operations.',
      contact: {
        name: 'PRM Tool',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token. Obtain it from POST /auth/login.',
        },
      },
      schemas: {
        // ─── Common Response Schemas ─────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },

        // ─── Auth Schemas ────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'admin' },
            password: { type: 'string', example: 'Admin@1234' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    fullName: { type: 'string' },
                    role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
                    forcePasswordChange: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', example: 'Admin@1234' },
            newPassword: { type: 'string', example: 'NewPass@123' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'Login, logout, password change' },
      { name: 'Admin - Users', description: 'User account management (Admin only)' },
      { name: 'Admin - Employees', description: 'Employee profile management (Admin only)' },
      { name: 'Admin - Projects', description: 'Project management (Admin only)' },
      { name: 'Admin - Config', description: 'System configuration (Admin only)' },
      { name: 'Admin - Allocations', description: 'Company-wide allocation view (Admin only)' },
      { name: 'Manager - Resources', description: 'Resource dashboard (Manager only)' },
      { name: 'Manager - Allocations', description: 'Resource allocation (Manager only)' },
      { name: 'Manager - Projects', description: 'Project view with health (Manager only)' },
      { name: 'Manager - Timesheets', description: 'Team timesheet view (Manager only)' },
      { name: 'Manager - AI', description: 'AI Skill Match and Risk Summary (Manager only)' },
      { name: 'Employee', description: 'Timesheets and allocations (Employee only)' },
    ],
  },
  // Path to files containing Swagger annotations
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
