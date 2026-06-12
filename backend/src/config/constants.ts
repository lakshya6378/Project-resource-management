/**
 * Application-wide constants and enums.
 * Single source of truth for all enum values used across models, services, and controllers.
 * Prevents magic strings and ensures consistency.
 */

// ─── User Roles ─────────────────────────────────────────────
const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
});

// ─── Employee Status ────────────────────────────────────────
const EMPLOYEE_STATUS = Object.freeze({
  BENCH: 'BENCH',
  ALLOCATED: 'ALLOCATED',
  INACTIVE: 'INACTIVE',
});

// ─── Project Status ─────────────────────────────────────────
const PROJECT_STATUS = Object.freeze({
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
});

// ─── Project Health Status (set by scheduler) ───────────────
const HEALTH_STATUS = Object.freeze({
  ON_TRACK: 'ON_TRACK',
  ATTENTION: 'ATTENTION',
  AT_RISK: 'AT_RISK',
});

// ─── Timesheet Status ───────────────────────────────────────
const TIMESHEET_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  MISSED: 'MISSED',
  FROZEN: 'FROZEN',
});

// ─── Milestone Status ───────────────────────────────────────
const MILESTONE_STATUS = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  AT_RISK: 'AT_RISK',
});

// ─── Timesheet Access Status ────────────────────────────────
const ACCESS_STATUS = Object.freeze({
  NONE: 'NONE',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

// ─── Skill Categories ───────────────────────────────────────
const SKILL_CATEGORIES = Object.freeze({
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
  DEVOPS: 'DevOps',
  QA: 'QA',
  OTHER: 'Other',
});

// ─── Proficiency Levels ─────────────────────────────────────
const PROFICIENCY_LEVELS = Object.freeze({
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  EXPERT: 'EXPERT',
});

// ─── LLM Providers ──────────────────────────────────────────
const LLM_PROVIDERS = Object.freeze({
  GEMINI: 'GEMINI',
  GROQ: 'GROQ',
  LOCAL_GEMMA: 'LOCAL_GEMMA',
});

// ─── Activity Tags (for timesheets) ─────────────────────────
const ACTIVITY_TAGS = Object.freeze([
  'Backend API Development',
  'Microservices / Architecture',
  'Database Design & Queries',
  'WebSocket / Real-time Features',
  'Frontend Development',
  'Code Review / Mentoring',
  'Bug Fixing',
  'DevOps / Deployment',
  'Testing & QA',
  'Documentation',
  'Other',
]);

// ─── Password Rules ─────────────────────────────────────────
const PASSWORD_RULES = Object.freeze({
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBER: true,
});

// ─── Pagination Defaults ────────────────────────────────────
const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

export {
  ROLES,
  EMPLOYEE_STATUS,
  PROJECT_STATUS,
  HEALTH_STATUS,
  TIMESHEET_STATUS,
  MILESTONE_STATUS,
  SKILL_CATEGORIES,
  PROFICIENCY_LEVELS,
  LLM_PROVIDERS,
  ACTIVITY_TAGS,
  PASSWORD_RULES,
  PAGINATION,
  ACCESS_STATUS,
};
