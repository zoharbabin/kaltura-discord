import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType, formatErrorResponse } from '../common/errorHandler';
import { logger } from '../common/logger';

/**
 * Express middleware for handling errors in API requests
 * 
 * @param error The error that occurred
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function errorMiddleware(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default values
  let statusCode = 500;
  let errorType = ErrorType.UNKNOWN;
  let message = 'Internal Server Error';
  let details = undefined;
  let context = 'API';
  
  // Check if it's an AppError
  if ('type' in error) {
    const appError = error as AppError;
    statusCode = appError.statusCode || 500;
    errorType = appError.type;
    message = appError.message;
    details = appError.details;
    context = appError.context || context;
  }
  
  // Log the error
  logger.error(`API Error: ${req.method} ${req.path}`, {
    type: errorType,
    statusCode,
    message,
    details,
    stack: error.stack,
    requestId: req.headers['x-request-id'] || 'unknown',
    userId: (req as any).userId || 'anonymous',
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Format the error response
  const errorResponse = formatErrorResponse(error as AppError);
  
  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Express middleware for handling async route handlers
 * 
 * @param fn Async route handler function
 * @returns Express middleware function
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express middleware for validating request parameters
 * 
 * @param schema Validation schema function that returns errors if validation fails
 * @returns Express middleware function
 */
export function validateRequest(schema: (req: Request) => string | null) {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = schema(req);
    if (error) {
      const appError = new Error(error) as AppError;
      appError.type = ErrorType.VALIDATION;
      appError.statusCode = 400;
      appError.context = 'Request Validation';
      next(appError);
      return;
    }
    next();
  };
}