/**
 * Admin Seed Script
 *
 * Creates the initial admin user and default system configuration.
 * Run once after fresh database setup: npm run seed
 *
 * Idempotent — safe to run multiple times:
 *   - Skips admin creation if any admin user already exists
 *   - Skips config creation if system_config document already exists
 *
 * Default credentials:
 *   Username: admin
 *   Password: Admin@1234
 *   forcePasswordChange: true (must change on first login)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env before importing models
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { User, SystemConfig } from '../src/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prm_tool';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');
    console.log(`📦 Connecting to: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ─── Seed Admin User ─────────────────────────────────────
    const existingAdmin = await User.findOne({ role: 'ADMIN' });

    if (existingAdmin) {
      console.log(`ℹ️  Admin user already exists: ${existingAdmin.username}`);
    } else {
      const admin = new User({
        username: 'admin',
        email: 'admin@prm-tool.local',
        fullName: 'System Administrator',
        passwordHash: 'Admin@1234', // pre-save hook will hash this
        role: 'ADMIN',
        isActive: true,
        forcePasswordChange: true,
      });

      await admin.save();
      console.log('✅ Admin user created:');
      console.log('   Username: admin');
      console.log('   Password: Admin@1234');
      console.log('   ⚠️  Password change will be required on first login');
    }

    // ─── Seed System Configuration ───────────────────────────
    const existingConfig = await SystemConfig.findOne();

    if (existingConfig) {
      console.log('ℹ️  System configuration already exists');
    } else {
      const config = new SystemConfig({
        llmProvider: 'GEMINI',
        llmApiKey: '',
        schedulerIntervalHours: 4,
        maxWeeklyHours: 40,
      });

      await config.save();
      console.log('✅ Default system configuration created:');
      console.log('   LLM Provider: GEMINI');
      console.log('   Scheduler Interval: 4 hours');
      console.log('   Max Weekly Hours: 40');
    }

    console.log('\n🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

seed();
