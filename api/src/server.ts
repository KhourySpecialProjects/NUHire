// src/server.ts

import dotenv from 'dotenv';
import { App } from './app';
import { databaseService } from './config/database';
import { configurePassport } from './config/passport';
import { initializeSocketHandlers } from './config/socket';

// Load environment variables
dotenv.config();

async function bootstrap() {
  try {
    console.log('🚀 Starting NUHire Backend...');

    // Connect to database
    console.log('📦 Connecting to database...');
    const db = await databaseService.connect();
    console.log('✅ Database connected');

    // Configure passport
    console.log('🔐 Configuring authentication...');
    configurePassport(db);
    console.log('✅ Authentication configured');

    // Initialize application
    console.log('⚙️ Initializing application...');
    const app = new App(db);
    console.log('✅ Application initialized');

    // Initialize socket handlers
    console.log('🔌 Initializing socket handlers...');
    app.onlineStudents = initializeSocketHandlers(app.io, db);
    console.log('✅ Socket handlers initialized');

    // Start server
    const PORT = parseInt(process.env.BACKEND_PORT || '10000', 10);
    app.listen(PORT);

    console.log('✅ NUHire Backend started successfully!');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
bootstrap();