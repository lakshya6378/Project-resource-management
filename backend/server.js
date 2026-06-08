const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const env = require('./src/config/env');
const db = require('./src/config/db');
const swaggerSpec = require('./src/swagger/swaggerConfig');
const { errorHandler } = require('./src/middleware/errorHandler');
const { checkForcePasswordChange, verifyToken } = require('./src/middleware/auth');

// ─── Route Imports ───────────────────────────────────────────
const authRoutes = require('./src/routes/auth.routes');

// ─── Express App Setup ───────────────────────────────────────
const app = express();

// ─── Global Middleware ───────────────────────────────────────
app.use(helmet());                         // Security headers
app.use(morgan('dev'));                     // Request logging
app.use(cors());                           // CORS — configure origins for production
app.use(express.json({ limit: '10mb' }));  // JSON body parser
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/auth', authRoutes);

// Protected routes (will be added in subsequent phases)
// app.use('/api/admin', verifyToken, checkForcePasswordChange, adminRoutes);
// app.use('/api/manager', verifyToken, checkForcePasswordChange, managerRoutes);
// app.use('/api/employee', verifyToken, checkForcePasswordChange, employeeRoutes);

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

startServer();

// Export app for testing (supertest)
module.exports = app;
