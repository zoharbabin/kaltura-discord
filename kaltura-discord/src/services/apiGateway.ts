import express, { Request, Response, NextFunction } from 'express';
import { logger, stream } from '../common/logger';
import morgan from 'morgan';
import { kalturaClient, MeetingCreateParams } from './kalturaClient';
import { userAuthService } from './userAuthService';
import jwt from 'jsonwebtoken';
import { getEnv } from '../common/envService';
import {
  UserPresence,
  NetworkQuality,
  UserStatus,
  PlaybackState,
  SyncMetrics,
  NetworkQualityUpdate,
  SyncRequest
} from '../types/userPresence';

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
    
    // Health check endpoints
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    app.get('/api/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    app.get('/api/gateway/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        apiGateway: true,
        version: '1.0.0'
      });
    });
    
    // API routes
    app.use('/api/meetings', createMeetingRoutes());
    app.use('/api/auth', createAuthRoutes());
    app.use('/api/videos', createVideoRoutes());
    app.use('/api/presence', createPresenceRoutes());
    app.use('/api/sync', createSyncRoutes());
    
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
 * Create video routes
 */
function createVideoRoutes() {
  const router = express.Router();
  
  // Apply authentication middleware to all video routes
  router.use(authMiddleware as express.RequestHandler);
  
  // Get all videos
  router.get('/', async (req: Request, res: Response) => {
    try {
      // Get the authenticated user
      const user = (req as any).user;
      
      // List videos (default parameters)
      const videos = await kalturaClient.searchVideos({
        freeText: '',
        limit: 10,
        page: 1
      });
      
      res.status(200).json({ videos });
    } catch (error) {
      logger.error('Error getting videos', { error });
      res.status(500).json({ error: 'Failed to get videos' });
    }
  });
  
  // Search for videos
  router.get('/search', async (req: Request, res: Response) => {
    try {
      // Get the authenticated user
      const user = (req as any).user;
      
      // Get search parameters from query
      const query = req.query.q as string || '';
      const limit = parseInt(req.query.limit as string || '10', 10);
      const page = parseInt(req.query.page as string || '1', 10);
      
      // Search for videos
      const videos = await kalturaClient.searchVideos({
        freeText: query,
        limit,
        page
      });
      
      res.status(200).json({ videos });
    } catch (error) {
      logger.error('Error searching videos', { error });
      res.status(500).json({ error: 'Failed to search videos' });
    }
  });
  
  // Get a specific video
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      // Get the video ID from the URL
      const videoId = req.params.id;
      
      // Get the video
      const video = await kalturaClient.getVideo(videoId);
      
      res.status(200).json({ video });
    } catch (error) {
      logger.error('Error getting video', { error, videoId: req.params.id });
      res.status(500).json({ error: 'Failed to get video' });
    }
  });
  
  // Generate play URL for a video
  router.post('/:id/play', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the video ID from the URL
      const videoId = req.params.id;
      
      // Get the authenticated user
      const user = (req as any).user;
      
      // Generate play URL for the video
      const playUrl = await kalturaClient.generateVideoPlayUrl(videoId, user.kalturaUserId);
      
      res.status(200).json({
        playUrl,
        videoId
      });
    } catch (error) {
      logger.error('Error generating play URL', { error, videoId: req.params.id });
      res.status(500).json({ error: 'Failed to generate play URL' });
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

/**
 * Create user presence routes
 */
function createPresenceRoutes() {
  const router = express.Router();
  
  // Apply authentication middleware to all presence routes
  router.use(authMiddleware as express.RequestHandler);
  
  // Get all user presences
  router.get('/users', async (req: Request, res: Response) => {
    try {
      // In a real implementation, this would fetch user presences from a database or service
      // For now, we'll return a mock response
      const userPresences: UserPresence[] = [
        {
          id: 'user1',
          username: 'User 1',
          isHost: true,
          status: 'active',
          lastActive: Date.now(),
          networkQuality: 'good',
          playbackState: {
            isPlaying: true,
            currentTime: 120,
            buffering: false
          }
        },
        {
          id: 'user2',
          username: 'User 2',
          isHost: false,
          status: 'active',
          lastActive: Date.now(),
          networkQuality: 'fair',
          playbackState: {
            isPlaying: true,
            currentTime: 118,
            buffering: false
          }
        }
      ];
      
      res.status(200).json({ userPresences });
    } catch (error) {
      logger.error('Error getting user presences', { error });
      res.status(500).json({ error: 'Failed to get user presences' });
    }
  });
  
  // Update user presence
  router.post('/update', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the authenticated user
      const user = (req as any).user;
      
      // Validate request body
      const { status, playbackState } = req.body as { status: UserStatus, playbackState?: PlaybackState };
      
      if (!status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // In a real implementation, this would update the user's presence in a database or service
      // For now, we'll just return a success response
      
      res.status(200).json({
        success: true,
        userId: user.discordId,
        status,
        playbackState,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error updating user presence', { error });
      res.status(500).json({ error: 'Failed to update user presence' });
    }
  });
  
  // Update network quality
  router.post('/network', async (req: Request, res: Response): Promise<any> => {
    try {
      // Validate request body
      const { userId, quality } = req.body as NetworkQualityUpdate;
      
      if (!userId || !quality) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!['good', 'fair', 'poor'].includes(quality)) {
        return res.status(400).json({ error: 'Invalid network quality' });
      }
      
      // In a real implementation, this would update the user's network quality in a database or service
      // For now, we'll just return a success response
      
      res.status(200).json({
        success: true,
        userId,
        quality,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error updating network quality', { error });
      res.status(500).json({ error: 'Failed to update network quality' });
    }
  });
  
  return router;
}

/**
 * Create synchronization routes
 */
function createSyncRoutes() {
  const router = express.Router();
  
  // Apply authentication middleware to all sync routes
  router.use(authMiddleware as express.RequestHandler);
  
  // Request synchronization
  router.post('/request', async (req: Request, res: Response): Promise<any> => {
    try {
      // Validate request body
      const { requesterId } = req.body as SyncRequest;
      
      if (!requesterId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // In a real implementation, this would notify the host to send the current playback state
      // For now, we'll just return a success response with a mock playback state
      
      res.status(200).json({
        success: true,
        requesterId,
        hostId: 'host1',
        playbackState: {
          isPlaying: true,
          currentTime: 120,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      logger.error('Error requesting synchronization', { error });
      res.status(500).json({ error: 'Failed to request synchronization' });
    }
  });
  
  // Broadcast playback state
  router.post('/broadcast', async (req: Request, res: Response): Promise<any> => {
    try {
      // Get the authenticated user
      const user = (req as any).user;
      
      // Validate request body
      const { playbackState } = req.body as { playbackState: PlaybackState };
      
      if (!playbackState) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // In a real implementation, this would broadcast the playback state to all participants
      // For now, we'll just return a success response
      
      res.status(200).json({
        success: true,
        hostId: user.discordId,
        playbackState,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error broadcasting playback state', { error });
      res.status(500).json({ error: 'Failed to broadcast playback state' });
    }
  });
  
  // Get sync metrics
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      // In a real implementation, this would fetch sync metrics from a database or service
      // For now, we'll return a mock response
      const syncMetrics = {
        averageSyncDelta: 0.5,
        syncAttempts: 10,
        syncSuccesses: 9,
        userMetrics: [
          {
            userId: 'user1',
            averageSyncDelta: 0.2,
            networkQuality: 'good' as NetworkQuality
          },
          {
            userId: 'user2',
            averageSyncDelta: 0.8,
            networkQuality: 'fair' as NetworkQuality
          }
        ]
      };
      
      res.status(200).json({ syncMetrics });
    } catch (error) {
      logger.error('Error getting sync metrics', { error });
      res.status(500).json({ error: 'Failed to get sync metrics' });
    }
  });
  
  return router;
}