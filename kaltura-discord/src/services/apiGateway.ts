import express, { Request, Response, NextFunction } from 'express';
import { logger, stream } from '../common/logger';
import morgan from 'morgan';
import { kalturaClient, MeetingCreateParams } from './kalturaClient';
import { userAuthService } from './userAuthService';
import jwt from 'jsonwebtoken';
import { getEnv } from '../common/envService';

// Create Express application
const app = express();
const port = getEnv('API_PORT', '3000');

// CORS middleware function
const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.status(200).json({});
    return;
  }
  next();
};

// Authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    // Check if the header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = userAuthService.verifyAuthToken(token);
    
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    
    // Add the user to the request object
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Start the API Gateway
 */
export async function startApiGateway(): Promise<void> {
  try {
    // Check if we have Kaltura credentials
    const partnerId = getEnv('KALTURA_PARTNER_ID');
    const adminSecret = getEnv('KALTURA_ADMIN_SECRET');
    
    if (!partnerId || !adminSecret || partnerId === 'your_kaltura_partner_id' || adminSecret === 'your_kaltura_admin_secret') {
      logger.warn('Using development mode: Kaltura API integration will use mock responses');
    }
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Logging middleware
    app.use(morgan('combined', { stream }));
    
    // Apply CORS middleware
    app.use(corsMiddleware);
    
    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // API routes
    app.use('/api/meetings', createMeetingRoutes());
    app.use('/api/auth', createAuthRoutes());
    
    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
      logger.error('API Error', { error: err, path: req.path });
      res.status(500).json({ error: 'Internal Server Error' });
    });
    
    // Start the server
    const server = app.listen(port, () => {
      logger.info(`API Gateway listening on port ${port}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      logger.error('API Gateway server error', { error });
      throw error;
    });
    
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to start API Gateway', { error });
    return Promise.reject(error);
  }
}

/**
 * Create meeting routes
 */
function createMeetingRoutes() {
  const router = express.Router();
  
  // Apply authentication middleware to all meeting routes
  router.use(authMiddleware as express.RequestHandler);
  
  // Get all meetings
  router.get('/', async (req: Request, res: Response) => {
    try {
      // Get the authenticated user
      const user = (req as any).user;
      
      // List meetings
      const meetings = await kalturaClient.listMeetings();
      
      res.status(200).json({ meetings });
    } catch (error) {
      logger.error('Error getting meetings', { error });
      res.status(500).json({ error: 'Failed to get meetings' });
    }
  });
  
  // Get a specific meeting
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      // Get the meeting ID from the URL
      const meetingId = req.params.id;
      
      // Get the meeting
      const meeting = await kalturaClient.getMeeting(meetingId);
      
      res.status(200).json({ meeting });
    } catch (error) {
      logger.error('Error getting meeting', { error, meetingId: req.params.id });
      res.status(500).json({ error: 'Failed to get meeting' });
    }
  });
  
  // Create a new meeting
  router.post('/', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the authenticated user
      const user = (req as any).user;
      
      // Validate request body
      const { title, description, type } = req.body;
      
      if (!title || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!['webinar', 'meeting', 'classroom'].includes(type)) {
        return res.status(400).json({ error: 'Invalid meeting type' });
      }
      
      // Create meeting parameters
      const meetingParams: MeetingCreateParams = {
        title,
        description,
        type: type as 'webinar' | 'meeting' | 'classroom',
        ownerId: user.kalturaUserId,
      };
      
      // Create the meeting
      const meeting = await kalturaClient.createMeeting(meetingParams);
      
      // Generate join URL for the creator
      const joinUrl = await userAuthService.generateMeetingJoinUrl(meeting.id, user);
      
      res.status(201).json({
        meeting,
        joinUrl
      });
    } catch (error) {
      logger.error('Error creating meeting', { error });
      res.status(500).json({ error: 'Failed to create meeting' });
    }
  });
  
  // End a meeting
  router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the meeting ID from the URL
      const meetingId = req.params.id;
      
      // Get the authenticated user
      const user = (req as any).user;
      
      // Get the meeting first to check if it exists
      const meeting = await kalturaClient.getMeeting(meetingId);
      
      // Check if the user is the owner of the meeting
      if (meeting.ownerId !== user.kalturaUserId) {
        return res.status(403).json({ error: 'You do not have permission to end this meeting' });
      }
      
      // End the meeting
      await kalturaClient.endMeeting(meetingId);
      
      res.status(200).json({
        success: true,
        message: 'Meeting ended successfully'
      });
    } catch (error) {
      logger.error('Error ending meeting', { error, meetingId: req.params.id });
      res.status(500).json({ error: 'Failed to end meeting' });
    }
  });
  
  // Generate join URL for a meeting
  router.post('/:id/join', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the meeting ID from the URL
      const meetingId = req.params.id;
      
      // Get the authenticated user
      const user = (req as any).user;
      
      // Get the meeting first to check if it exists
      const meeting = await kalturaClient.getMeeting(meetingId);
      
      // Generate join URL for the user
      const joinUrl = await userAuthService.generateMeetingJoinUrl(meeting.id, user);
      
      res.status(200).json({
        joinUrl,
        meeting
      });
    } catch (error) {
      logger.error('Error generating join URL', { error, meetingId: req.params.id });
      res.status(500).json({ error: 'Failed to generate join URL' });
    }
  });
  
  return router;
}

/**
 * Create authentication routes
 */
function createAuthRoutes() {
  const router = express.Router();
  
  // Generate a token for a user
  router.post('/token', async (req: Request, res: Response): Promise<any> => {
    try {
      // Validate request body
      const { discordId, username, roles } = req.body;
      
      if (!discordId || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Create Discord user object
      const discordUser: any = {
        id: discordId,
        username,
        roles: roles || []
      };
      
      // Map Discord user to Kaltura user
      const mappedUser = await userAuthService.mapDiscordUserToKaltura(discordUser);
      
      // Generate authentication token
      const authToken = userAuthService.generateAuthToken(mappedUser);
      
      // Generate Kaltura session
      const kalturaSession = await userAuthService.generateKalturaSession(mappedUser);
      
      res.status(200).json({
        token: authToken.token,
        expiresAt: authToken.expiresAt,
        user: mappedUser,
        kalturaSession
      });
    } catch (error) {
      logger.error('Error generating token', { error });
      res.status(500).json({ error: 'Failed to generate token' });
    }
  });
  
  // Validate a token
  router.post('/validate', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the token from the request body
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Missing token' });
      }
      
      // Verify the token
      const user = userAuthService.verifyAuthToken(token);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Generate a new Kaltura session
      const kalturaSession = await userAuthService.generateKalturaSession(user);
      
      res.status(200).json({
        valid: true,
        user,
        kalturaSession
      });
    } catch (error) {
      logger.error('Error validating token', { error });
      res.status(500).json({ error: 'Failed to validate token' });
    }
  });
  
  // Refresh a token
  router.post('/refresh', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the token from the request body
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Missing token' });
      }
      
      // Verify the token
      const user = userAuthService.verifyAuthToken(token);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Generate a new authentication token
      const authToken = userAuthService.generateAuthToken(user);
      
      // Generate a new Kaltura session
      const kalturaSession = await userAuthService.generateKalturaSession(user);
      
      res.status(200).json({
        token: authToken.token,
        expiresAt: authToken.expiresAt,
        user,
        kalturaSession
      });
    } catch (error) {
      logger.error('Error refreshing token', { error });
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  });
  
  return router;
}