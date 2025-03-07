import dotenv from 'dotenv';
import { startBot } from './discord/bot';
import { startApiGateway } from './services/apiGateway';
import { logger } from './common/logger';
import { configService } from './services/configService';

// Load environment variables
dotenv.config();

/**
 * Main application entry point
 */
async function main() {
  try {
    // Initialize the configuration service
    try {
      await configService.initialize();
      logger.info('Configuration service initialized successfully');
    } catch (configError) {
      logger.error('Failed to initialize configuration service', { error: configError });
      process.exit(1);
    }
    
    // Start the Discord bot
    try {
      await startBot();
      logger.info('Discord bot started successfully');
    } catch (botError) {
      logger.warn('Discord bot failed to start, continuing with API Gateway only', { error: botError });
    }
    
    // Start the API Gateway
    try {
      await startApiGateway();
      logger.info('API Gateway started successfully');
    } catch (apiError) {
      logger.error('API Gateway failed to start', { error: apiError });
      process.exit(1);
    }
    
    logger.info('Kaltura-Discord integration started successfully');
  } catch (error) {
    logger.error('Failed to start Kaltura-Discord integration', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the application
main();