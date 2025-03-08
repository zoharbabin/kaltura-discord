# Code Cleanup Recommendations

This document outlines specific recommendations for cleaning up the codebase to improve maintainability, readability, and performance.

## 1. Replace Mock Implementations with Real API Calls

### Current Issues

The Discord Activity server (`discord-activity/packages/server/src/app.ts`) currently uses mock implementations for:
- Kaltura Session (KS) generation
- Video details retrieval

### Recommendations

1. **Implement Kaltura API Client**:

```typescript
// Create a new file: discord-activity/packages/server/src/services/kalturaService.ts

import axios from 'axios';

export interface KalturaSessionOptions {
  partnerId: string;
  adminSecret: string;
  userId?: string;
  type?: number; // 0 = USER, 2 = ADMIN
  expiry?: number; // in seconds
  privileges?: string;
}

export class KalturaService {
  private apiEndpoint: string;
  
  constructor(apiEndpoint: string = 'https://www.kaltura.com/api_v3') {
    this.apiEndpoint = apiEndpoint;
  }
  
  /**
   * Generate a Kaltura Session (KS)
   */
  async generateSession(options: KalturaSessionOptions): Promise<string> {
    try {
      const response = await axios.post(`${this.apiEndpoint}/service/session/action/start`, null, {
        params: {
          format: 1, // JSON
          partnerId: options.partnerId,
          secret: options.adminSecret,
          type: options.type || 0,
          userId: options.userId || 'anonymous',
          expiry: options.expiry || 86400, // 24 hours
          privileges: options.privileges || ''
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating Kaltura session:', error);
      throw error;
    }
  }
  
  /**
   * Get video details by entry ID
   */
  async getVideoDetails(entryId: string, ks: string): Promise<any> {
    try {
      const response = await axios.post(`${this.apiEndpoint}/service/media/action/get`, null, {
        params: {
          format: 1, // JSON
          ks,
          entryId
        }
      });
      
      return {
        id: response.data.id,
        title: response.data.name,
        description: response.data.description,
        duration: response.data.duration,
        thumbnailUrl: response.data.thumbnailUrl,
        partnerId: response.data.partnerId,
        createdAt: response.data.createdAt,
        views: response.data.views || 0
      };
    } catch (error) {
      console.error('Error getting video details:', error);
      throw error;
    }
  }
}
```

2. **Update Server Endpoints**:

Replace the mock implementations in `app.ts` with calls to the Kaltura service:

```typescript
// Import the Kaltura service
import { KalturaService } from './services/kalturaService';

// Initialize the service
const kalturaService = new KalturaService(process.env.KALTURA_API_ENDPOINT);

// Update the session handler
const sessionHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId, userId } = req.body;
    
    if (!videoId) {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }
    
    // Generate a real Kaltura session
    const ks = await kalturaService.generateSession({
      partnerId: process.env.KALTURA_PARTNER_ID || '',
      adminSecret: process.env.KALTURA_ADMIN_SECRET || '',
      userId: userId || 'anonymous',
      type: 0, // USER session
      privileges: `sview:${videoId}` // Add privileges to view this specific entry
    });
    
    res.send({ ks });
  } catch (error) {
    console.error('KS generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update the video handler
const videoHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }
    
    // Generate an admin KS for API access
    const adminKs = await kalturaService.generateSession({
      partnerId: process.env.KALTURA_PARTNER_ID || '',
      adminSecret: process.env.KALTURA_ADMIN_SECRET || '',
      type: 2, // ADMIN session
    });
    
    // Get real video details
    const video = await kalturaService.getVideoDetails(videoId, adminKs);
    
    res.send(video);
  } catch (error) {
    console.error('Video details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

## 2. Standardize Error Handling

### Current Issues

Error handling is inconsistent across the codebase, with some functions using try/catch blocks and others not handling errors at all.

### Recommendations

1. **Create a Centralized Error Handler**:

```typescript
// Create a new file: src/common/errorHandler.ts

import { logger } from './logger';

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  API = 'API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

export interface AppError extends Error {
  type: ErrorType;
  statusCode?: number;
  details?: any;
}

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

export function handleError(error: any, context: string): AppError {
  // Convert to AppError if it's not already
  const appError = error.type ? error : createError(
    error.message || 'An unknown error occurred',
    ErrorType.UNKNOWN,
    500,
    error
  );
  
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
```

2. **Use the Error Handler Throughout the Codebase**:

```typescript
// Example usage in kalturaClient.ts

import { createError, handleError, ErrorType } from '../common/errorHandler';

export async function getVideo(videoId: string): Promise<Video> {
  try {
    // API call logic
    const response = await api.get(`/media/action/get`, {
      params: { entryId: videoId }
    });
    
    return mapVideoResponse(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      throw createError(
        `Video not found: ${videoId}`,
        ErrorType.API,
        404
      );
    }
    
    throw handleError(error, `getVideo(${videoId})`);
  }
}
```

3. **Create Express Middleware for API Error Handling**:

```typescript
// Create a new file: src/middleware/errorMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from '../common/errorHandler';
import { logger } from '../common/logger';

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
  
  // Check if it's an AppError
  if ('type' in error) {
    const appError = error as AppError;
    statusCode = appError.statusCode || 500;
    errorType = appError.type;
    message = appError.message;
    details = appError.details;
  }
  
  // Log the error
  logger.error(`API Error: ${req.method} ${req.path}`, {
    type: errorType,
    statusCode,
    message,
    details,
    stack: error.stack
  });
  
  // Send response
  res.status(statusCode).json({
    error: {
      type: errorType,
      message,
      ...(process.env.NODE_ENV !== 'production' && { details })
    }
  });
}
```

## 3. Improve TypeScript Type Definitions

### Current Issues

Some parts of the codebase use `any` types or have missing type definitions.

### Recommendations

1. **Define Interfaces for API Responses**:

```typescript
// Create a new file: src/types/kaltura.ts

export interface KalturaMediaEntry {
  id: string;
  name: string;
  description: string;
  partnerId: number;
  userId: string;
  createdAt: number;
  updatedAt: number;
  status: number;
  moderationStatus: number;
  moderationCount: number;
  type: number;
  totalRank: number;
  rank: number;
  tags: string;
  duration: number;
  views: number;
  width: number;
  height: number;
  msDuration: number;
  downloadUrl: string;
  dataUrl: string;
  thumbnailUrl: string;
  mediaType: number;
}

export interface KalturaListResponse<T> {
  objects: T[];
  totalCount: number;
}

export interface KalturaAPIResponse<T> {
  executionTime: number;
  result: T;
}
```

2. **Use Strict TypeScript Configuration**:

Update `tsconfig.json` to enforce stricter type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 4. Standardize Logging

### Current Issues

Logging is inconsistent, with some parts using console.log and others using the logger service.

### Recommendations

1. **Enhance the Logger Service**:

```typescript
// Update src/common/logger.ts

import winston from 'winston';
import { getEnv } from './envService';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports to use based on environment
const transports = [
  // Always log to console
  new winston.transports.Console(),
];

// Add file transport in production
if (getEnv('NODE_ENV') === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/all.log' }),
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: getEnv('LOG_LEVEL', 'info'),
  levels,
  format,
  transports,
});

// Create a stream object for Morgan middleware
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
```

2. **Replace Console Logs with Logger**:

Search for all instances of `console.log`, `console.error`, etc. and replace them with the appropriate logger method:

```typescript
// Before
console.log('Starting server on port', port);
console.error('Failed to connect to database', error);

// After
logger.info(`Starting server on port ${port}`);
logger.error('Failed to connect to database', { error });
```

3. **Add Request Logging Middleware**:

```typescript
// Create a new file: src/middleware/requestLogger.ts

import morgan from 'morgan';
import { stream } from '../common/logger';

// Create a custom Morgan format
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

// Export the middleware
export const requestLogger = morgan(morganFormat, { stream });
```

## 5. Remove Redundant Files and Code

### Recommendations

1. **Remove Unused Test Files**:

Scan the codebase for unused test files and remove them:

```bash
# Files that might be candidates for removal
- tests/unused-test.js
- src/services/__tests__/unused-service.test.ts
```

2. **Consolidate Duplicate Code**:

Identify and consolidate duplicate code patterns, especially in:
- Environment variable handling between main project and Discord Activity
- API client implementations
- Authentication logic

3. **Remove Debug Logs in Production**:

Remove or conditionally disable debug logs in production:

```typescript
// Before
console.log('[DEBUG] Starting to load Kaltura Player script', {
  partnerId: this.options.partnerId,
  uiconfId: this.options.uiconfId
});

// After
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Starting to load Kaltura Player script', {
    partnerId: this.options.partnerId,
    uiconfId: this.options.uiconfId
  });
}
```

## 6. Add Comprehensive JSDoc Comments

### Recommendations

Add JSDoc comments to all functions, classes, and interfaces:

```typescript
/**
 * Generates a Kaltura Session (KS) for authentication
 * 
 * @param {string} partnerId - The Kaltura partner ID
 * @param {string} secret - The admin or user secret
 * @param {string} [userId='anonymous'] - The user ID to associate with the session
 * @param {number} [type=0] - The session type (0=USER, 2=ADMIN)
 * @param {number} [expiry=86400] - Session expiry in seconds (default: 24 hours)
 * @param {string} [privileges=''] - Additional privileges for the session
 * @returns {Promise<string>} The generated Kaltura Session
 * @throws {Error} If the session generation fails
 */
async function generateKalturaSession(
  partnerId: string,
  secret: string,
  userId: string = 'anonymous',
  type: number = 0,
  expiry: number = 86400,
  privileges: string = ''
): Promise<string> {
  // Implementation
}
```

## Conclusion

Implementing these recommendations will significantly improve the codebase's maintainability, readability, and robustness. The changes focus on:

1. Replacing mock implementations with real API calls
2. Standardizing error handling across the codebase
3. Improving TypeScript type definitions
4. Standardizing logging practices
5. Removing redundant files and code
6. Adding comprehensive documentation

These changes should be implemented incrementally, with thorough testing after each change to ensure the application continues to function correctly.