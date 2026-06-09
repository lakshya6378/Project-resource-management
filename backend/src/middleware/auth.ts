import jwt from 'jsonwebtoken';
import env from '../config/env';
import { User } from '../models';

/**
 * Token Blacklist — In-memory set for invalidated tokens.
 *
 * When a user logs out, their token is added here.
 * Subsequent requests with that token are rejected.
 *
 * Note: In production, use Redis for persistence across server restarts.
 * This in-memory approach works for development and single-instance deployments.
 */
const tokenBlacklist = new Set();

/**
 * Add a token to the blacklist (called on logout).
 * @param {string} token - JWT token to invalidate
 */
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

/**
 * Check if a token has been blacklisted.
 * @param {string} token - JWT token to check
 * @returns {boolean}
 */
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * verifyToken Middleware
 *
 * Extracts JWT from the Authorization header, verifies it,
 * and attaches the decoded user info to req.user.
 *
 * Expected header format: Authorization: Bearer <token>
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Check if token has been blacklisted (logged out)
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please log in again.',
      });
    }

    // Verify and decode the token
    const decoded: any = jwt.verify(token, env.JWT_SECRET);

    // Verify user still exists and is active
    const user = await User.findById(decoded.id).select('_id username role isActive forcePasswordChange');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account has been deactivated.',
      });
    }

    // Attach user info and raw token to request
    req.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      forcePasswordChange: user.forcePasswordChange,
    };
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    next(error);
  }
};

/**
 * requireRole Middleware Factory
 *
 * Returns middleware that checks if the authenticated user
 * has one of the allowed roles. Must be used AFTER verifyToken.
 *
 * Usage: requireRole('ADMIN') or requireRole('ADMIN', 'MANAGER')
 *
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

/**
 * checkForcePasswordChange Middleware
 *
 * Blocks access to all routes (except change-password) if the user
 * must change their password on first login.
 *
 * Must be used AFTER verifyToken.
 */
const checkForcePasswordChange = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Allow access to the change-password endpoint itself
  if (req.path === '/auth/change-password' || req.path === '/api/auth/change-password') {
    return next();
  }

  if (req.user.forcePasswordChange) {
    return res.status(403).json({
      success: false,
      message: 'Password change required. Please change your password before accessing the system.',
      forcePasswordChange: true,
    });
  }

  next();
};

/**
 * Generate a JWT token for a user.
 * @param {Object} user - User document (must have _id, username, role)
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRY as any,
    }
  );
};

export {
  verifyToken,
  requireRole,
  checkForcePasswordChange,
  generateToken,
  blacklistToken,
  isTokenBlacklisted,
};
