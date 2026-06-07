const mongoose = require('mongoose');
const env = require('./env');

/**
 * DatabaseManager — Singleton Pattern
 *
 * Ensures a single MongoDB connection pool is shared across the application.
 * Provides connect/disconnect methods with graceful shutdown handling.
 *
 * Design Pattern: Singleton
 *   - Only one instance of DatabaseManager exists
 *   - Connection is established once and reused
 *   - Prevents multiple connection pools from being created
 */
class DatabaseManager {
  constructor() {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    this.isConnected = false;
    DatabaseManager.instance = this;
  }

  /**
   * Connect to MongoDB.
   * Uses the URI from environment config.
   * Logs connection events for monitoring.
   */
  async connect() {
    if (this.isConnected) {
      console.log('ℹ️  MongoDB already connected');
      return;
    }

    try {
      const options = {
        // Connection pool settings
        maxPoolSize: 10,
        minPoolSize: 2,
        // Timeouts
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(env.MONGODB_URI, options);
      this.isConnected = true;

      console.log(`✅ MongoDB connected: ${this._maskUri(env.MONGODB_URI)}`);

      // Connection event listeners
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Gracefully disconnect from MongoDB.
   * Called during server shutdown (SIGTERM, SIGINT).
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ MongoDB disconnected gracefully');
    } catch (error) {
      console.error('❌ Error during MongoDB disconnect:', error.message);
    }
  }

  /**
   * Get the underlying Mongoose connection instance.
   * Useful for health checks and diagnostics.
   */
  getConnection() {
    return mongoose.connection;
  }

  /**
   * Mask the MongoDB URI for safe logging.
   * Hides password if present, shows host and database name.
   * @private
   */
  _maskUri(uri) {
    try {
      const url = new URL(uri);
      if (url.password) {
        url.password = '****';
      }
      return url.toString();
    } catch {
      // For simple URIs like mongodb://localhost:27017/prm_tool
      return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    }
  }
}

// Export a singleton instance
module.exports = new DatabaseManager();
