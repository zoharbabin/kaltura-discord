import { logger } from './logger';

/**
 * Error types for categorizing different kinds of errors
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  API = 'API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  DISCORD = 'DISCORD_ERROR',
  KALTURA = 'KALTURA_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Extended Error interface with additional properties
 */
export interface AppError extends Error {
  type: ErrorType;
  statusCode?: number;
  details?: any;
  context?: string;
}

/**
 * Create an application error with additional metadata
 * 
 * @param message Error message
 * @param type Error type from ErrorType enum
 * @param statusCode HTTP status code (if applicable)
 * @param details Additional error details
 * @returns AppError instance
 */
export function createError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  statusCode: number = 500,
  details?: any
): AppError {
  const error = new Error(message) as AppError;
  error.type = type;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

/**
 * Handle an error by logging it and returning a standardized AppError
 * 
 * @param error The error to handle
 * @param context Context where the error occurred
 * @returns AppError instance
 */
export function handleError(error: any, context: string): AppError {
  // Convert to AppError if it's not already
  const appError = error.type ? error as AppError : createError(
    error.message || 'An unknown error occurred',
    ErrorType.UNKNOWN,
    500,
    error
  );
  
  // Add context to the error
  appError.context = context;
  
  // Log the error with context
  logger.error(`Error in ${context}:`, {
    type: appError.type,
    message: appError.message,
    statusCode: appError.statusCode,
    details: appError.details,
    stack: appError.stack
  });
  
  return appError;
}

/**
 * Format an error for API responses
 * 
 * @param error The error to format
 * @param includeDetails Whether to include error details (default: false in production)
 * @returns Formatted error object
 */
export function formatErrorResponse(error: AppError, includeDetails: boolean = process.env.NODE_ENV !== 'production'): object {
  const response: any = {
    error: error.type,
    message: error.message
  };
  
  if (error.statusCode) {
    response.statusCode = error.statusCode;
  }
  
  if (includeDetails && error.details) {
    response.details = error.details;
  }
  
  return response;
}

/**
 * Wrap an async function with error handling
 * 
 * @param fn The async function to wrap
 * @param context Context for error handling
 * @returns Wrapped function that handles errors
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, context);
    }
  };
}