import winston from 'winston';
import { getEnv } from './envService';

/**
 * Custom format to properly serialize error objects
 */
const errorSerializer = winston.format((info) => {
  if (info.error instanceof Error) {
    info.error = {
      errorMessage: info.error.message,
      stack: info.error.stack,
      ...Object.getOwnPropertyNames(info.error).reduce((obj, prop) => {
        if (prop !== 'message' && prop !== 'stack') {
          obj[prop] = (info.error as any)[prop];
        }
        return obj;
      }, {} as Record<string, any>)
    };
  }
  return info;
});

/**
 * Configure the logger with appropriate log levels and formats
 */
export const logger = winston.createLogger({
  level: getEnv('LOG_LEVEL', 'info'),
  format: winston.format.combine(
    errorSerializer(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'kaltura-discord' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        errorSerializer(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs to combined.log
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production, also log to the console with simpler formatting
if (getEnv('NODE_ENV', 'development') !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

/**
 * Stream object for Morgan middleware
 */
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};