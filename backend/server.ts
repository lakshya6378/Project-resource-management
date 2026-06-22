import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';

import env from './src/config/env';
import db from './src/config/db';
import swaggerSpec from './src/swagger/swaggerConfig';
import { errorHandler } from './src/middleware/errorHandler';
import { checkForcePasswordChange, verifyToken, requireRole } from './src/middleware/auth';
import schedulerService from './src/services/SchedulerService';

// ─── Route Imports ───────────────────────────────────────────
import authRoutes from './src/routes/auth.routes';
import adminRoutes from './src/routes/admin.routes';
import managerRoutes from './src/routes/manager.routes';
import employeeRoutes from './src/routes/employee.routes';

// ─── Express App Setup ───────────────────────────────────────
const app = express();

// ─── Global Middleware ───────────────────────────────────────
app.use(helmet());                         // Security headers
app.use(morgan('dev'));                     // Request logging

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));                // Dynamic CORS

app.use(express.json({ limit: '10mb' }));  // JSON body parser
app.use(express.urlencoded({ extended: true }));

// Rate Limiting for Auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, 
  legacyHeaders: false,
});

// ─── Swagger UI ──────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'PRM Tool API Documentation',
    swaggerOptions: {
      persistAuthorization: true,  // Keep auth token across page refreshes
    },
  })
);

// Serve raw OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PRM Tool API is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────
// Public routes (no auth required)
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/admin', verifyToken, requireRole('ADMIN'), checkForcePasswordChange, adminRoutes);
app.use('/api/manager', verifyToken, requireRole('MANAGER'), checkForcePasswordChange, managerRoutes);
app.use('/api/employee', verifyToken, requireRole('EMPLOYEE'), checkForcePasswordChange, employeeRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
  next();
});

// ─── Global Error Handler (must be last) ─────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB
    await db.connect();

    // Start Scheduler
    await schedulerService.start();

    // Initialize Email Service
    const emailService = require('./src/services/EmailService').default;
    await emailService.init();

    // Start listening
    const server = app.listen(env.PORT, () => {
      console.log(`\n🚀 PRM Tool API Server`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Server:      http://localhost:${env.PORT}`);
      console.log(`   API Base:    http://localhost:${env.PORT}/api`);
      console.log(`   Swagger UI:  http://localhost:${env.PORT}/api-docs`);
      console.log(`   Health:      http://localhost:${env.PORT}/api/health`);
      console.log('');
    });

    // ─── Graceful Shutdown ────────────────────────────────────
    const gracefulShutdown = async (signal) => {
      console.log(`\n📛 ${signal} received. Shutting down gracefully...`);
      schedulerService.stop();
      server.close(async () => {
        await db.disconnect();
        console.log('👋 Server shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

// Export app for testing (supertest)
export default app;
