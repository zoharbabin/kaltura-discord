import { Request, Response, NextFunction } from 'express';
import { logger } from '../common/logger';

/**
 * Generate a unique request ID
 * @returns A unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Calculate request duration in milliseconds
 * @param start Start time in [seconds, nanoseconds]
 * @returns Duration in milliseconds
 */
function calculateDuration(start: [number, number]): number {
  const end = process.hrtime(start);
  return (end[0] * 1000) + (end[1] / 1000000);
}

/**
 * Express middleware for logging requests
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate a unique request ID if not already present
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  req.headers['x-request-id'] = requestId;
  
  // Record start time
  const startTime = process.hrtime();
  
  // Log request
  logger.info(`Request started: ${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).userId || 'anonymous'
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = calculateDuration(startTime);
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level](`Request completed: ${req.method} ${req.path} ${res.statusCode}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      contentLength: res.getHeader('content-length'),
      userId: (req as any).userId || 'anonymous'
    });
  });
  
  // Log if response is closed prematurely
  res.on('close', () => {
    if (!res.writableEnded) {
      const duration = calculateDuration(startTime);
      
      logger.warn(`Request closed prematurely: ${req.method} ${req.path}`, {
        requestId,
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        userId: (req as any).userId || 'anonymous'
      });
    }
  });
  
  next();
}

/**
 * Express middleware for adding request ID to response headers
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}