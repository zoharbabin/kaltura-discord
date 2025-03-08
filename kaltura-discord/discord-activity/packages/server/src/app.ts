import path from 'node:path';
import dotenv from 'dotenv';
import express, {
  type Application,
  type Request,
  type Response,
  type RequestHandler,
} from 'express';
import { fetchAndRetry } from './utils';
import { KalturaService } from './services/kalturaService';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: `../../.env.${nodeEnv}` });

const app: Application = express();
const port: number = Number(process.env.PORT) || 3001;

// Initialize Kaltura service
const kalturaService = new KalturaService(process.env.VITE_KALTURA_API_ENDPOINT);

// Middleware
app.use(express.json());

// CORS middleware for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, res: Response, next: express.NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });
}

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
}

// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Fetch token from Discord and return to the embedded app
const tokenHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await fetchAndRetry('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_CLIENT_ID || '',
        client_secret: process.env.CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: req.body.code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Discord token exchange failed:', errorData);
      res.status(response.status).json({
        error: 'Failed to exchange code for token',
        details: errorData
      });
      return;
    }

    const { access_token, token_type, expires_in, scope } = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    };

    res.send({ access_token, token_type, expires_in, scope });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate Kaltura Session (KS) for a video
const sessionHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId, userId } = req.body;
    
    if (!videoId) {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }
    
    // Validate required environment variables
    const partnerId = process.env.VITE_KALTURA_PARTNER_ID;
    const adminSecret = process.env.KALTURA_ADMIN_SECRET;
    
    if (!partnerId || !adminSecret) {
      console.error('Missing required environment variables:', {
        partnerId: !!partnerId,
        adminSecret: !!adminSecret
      });
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    // For development/testing, use a mock KS if we're using placeholder credentials
    if (partnerId === 'your_kaltura_partner_id' || adminSecret === 'your_kaltura_admin_secret') {
      console.log('Using mock KS for development/testing');
      const mockKs = `mock_ks_${videoId}_${userId || 'anonymous'}_${Date.now()}`;
      res.send({ ks: mockKs });
      return;
    }
    
    try {
      // Generate a real Kaltura session
      const ks = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        userId: userId || 'anonymous',
        type: 0, // USER session
        privileges: `sview:${videoId}` // Add privileges to view this specific entry
      });
      
      res.send({ ks });
    } catch (ksError) {
      console.error('KS generation error:', ksError);
      
      // Provide a mock KS for development/testing if real API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock KS for development');
        const mockKs = `mock_ks_${videoId}_${userId || 'anonymous'}_${Date.now()}`;
        res.send({ ks: mockKs });
        return;
      }
      
      throw ksError;
    }
  } catch (error) {
    console.error('KS generation error:', error);
    res.status(500).json({
      error: 'Failed to generate Kaltura session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get video details
const videoHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }
    
    // Validate required environment variables
    const partnerId = process.env.VITE_KALTURA_PARTNER_ID;
    const adminSecret = process.env.KALTURA_ADMIN_SECRET;
    
    if (!partnerId || !adminSecret) {
      console.error('Missing required environment variables:', {
        partnerId: !!partnerId,
        adminSecret: !!adminSecret
      });
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    // For development/testing, use mock video details if we're using placeholder credentials
    if (partnerId === 'your_kaltura_partner_id' || adminSecret === 'your_kaltura_admin_secret') {
      console.log('Using mock video details for development/testing');
      const mockVideo = {
        id: videoId,
        title: `Sample Video (${videoId})`,
        description: 'This is a sample video for development and testing purposes.',
        duration: 120, // 2 minutes
        thumbnailUrl: 'https://via.placeholder.com/640x360?text=Sample+Video',
        partnerId: partnerId,
        createdAt: new Date().toISOString(),
        views: 100
      };
      res.send(mockVideo);
      return;
    }
    
    try {
      // Generate an admin KS for API access
      const adminKs = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        type: 2, // ADMIN session
      });
      
      // Get real video details
      const video = await kalturaService.getVideoDetails(videoId, adminKs);
      
      res.send(video);
    } catch (videoError) {
      console.error('Video details API error:', videoError);
      
      // Provide mock video details for development/testing if real API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock video details for development');
        const mockVideo = {
          id: videoId,
          title: `Sample Video (${videoId})`,
          description: 'This is a sample video for development and testing purposes.',
          duration: 120, // 2 minutes
          thumbnailUrl: 'https://via.placeholder.com/640x360?text=Sample+Video',
          partnerId: partnerId,
          createdAt: new Date().toISOString(),
          views: 100
        };
        res.send(mockVideo);
        return;
      }
      
      throw videoError;
    }
  } catch (error) {
    console.error('Video details error:', error);
    res.status(500).json({
      error: 'Failed to get video details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search videos
const searchVideosHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 30;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'query parameter is required' });
      return;
    }
    
    // Validate required environment variables
    const partnerId = process.env.VITE_KALTURA_PARTNER_ID;
    const adminSecret = process.env.KALTURA_ADMIN_SECRET;
    
    if (!partnerId || !adminSecret) {
      console.error('Missing required environment variables:', {
        partnerId: !!partnerId,
        adminSecret: !!adminSecret
      });
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    // For development/testing, use mock videos if we're using placeholder credentials
    if (partnerId === 'your_kaltura_partner_id' || adminSecret === 'your_kaltura_admin_secret') {
      console.log('Using mock videos for development/testing');
      const mockVideos = Array.from({ length: 5 }, (_, i) => ({
        id: `mock_video_${i + 1}`,
        title: `Sample Video ${i + 1} - "${query}"`,
        description: `This is a sample video ${i + 1} for development and testing purposes.`,
        duration: 60 + i * 30, // 1-3 minutes
        thumbnailUrl: `https://via.placeholder.com/640x360?text=Sample+Video+${i + 1}`,
        partnerId: partnerId,
        createdAt: new Date().toISOString(),
        views: 100 + i * 25
      }));
      res.send({ videos: mockVideos, page, pageSize, totalCount: mockVideos.length });
      return;
    }
    
    try {
      // Generate an admin KS for API access
      const adminKs = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        type: 2, // ADMIN session
      });
      
      // Search videos
      const videos = await kalturaService.searchVideos(adminKs, query, pageSize, page);
      
      res.send({ videos, page, pageSize, totalCount: videos.length });
    } catch (searchError) {
      console.error('Video search API error:', searchError);
      
      // Provide mock videos for development/testing if real API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock videos for development');
        const mockVideos = Array.from({ length: 5 }, (_, i) => ({
          id: `mock_video_${i + 1}`,
          title: `Sample Video ${i + 1} - "${query}"`,
          description: `This is a sample video ${i + 1} for development and testing purposes.`,
          duration: 60 + i * 30, // 1-3 minutes
          thumbnailUrl: `https://via.placeholder.com/640x360?text=Sample+Video+${i + 1}`,
          partnerId: partnerId,
          createdAt: new Date().toISOString(),
          views: 100 + i * 25
        }));
        res.send({ videos: mockVideos, page, pageSize, totalCount: mockVideos.length });
        return;
      }
      
      throw searchError;
    }
  } catch (error) {
    console.error('Video search error:', error);
    res.status(500).json({
      error: 'Failed to search videos',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// List videos
const listVideosHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 30;
    
    // Validate required environment variables
    const partnerId = process.env.VITE_KALTURA_PARTNER_ID;
    const adminSecret = process.env.KALTURA_ADMIN_SECRET;
    
    if (!partnerId || !adminSecret) {
      console.error('Missing required environment variables:', {
        partnerId: !!partnerId,
        adminSecret: !!adminSecret
      });
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    // For development/testing, use mock videos if we're using placeholder credentials
    if (partnerId === 'your_kaltura_partner_id' || adminSecret === 'your_kaltura_admin_secret') {
      console.log('Using mock videos for development/testing');
      const mockVideos = Array.from({ length: 10 }, (_, i) => ({
        id: `mock_video_${i + 1}`,
        title: `Sample Video ${i + 1}`,
        description: `This is a sample video ${i + 1} for development and testing purposes.`,
        duration: 60 + i * 30, // 1-5 minutes
        thumbnailUrl: `https://via.placeholder.com/640x360?text=Sample+Video+${i + 1}`,
        partnerId: partnerId,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(), // Staggered dates
        views: 100 + i * 50
      }));
      res.send({ videos: mockVideos, page, pageSize, totalCount: mockVideos.length });
      return;
    }
    
    try {
      // Generate an admin KS for API access
      const adminKs = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        type: 2, // ADMIN session
      });
      
      // List videos
      const videos = await kalturaService.listVideos(adminKs, pageSize, page);
      
      res.send({ videos, page, pageSize, totalCount: videos.length });
    } catch (listError) {
      console.error('Video list API error:', listError);
      
      // Provide mock videos for development/testing if real API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock videos for development');
        const mockVideos = Array.from({ length: 10 }, (_, i) => ({
          id: `mock_video_${i + 1}`,
          title: `Sample Video ${i + 1}`,
          description: `This is a sample video ${i + 1} for development and testing purposes.`,
          duration: 60 + i * 30, // 1-5 minutes
          thumbnailUrl: `https://via.placeholder.com/640x360?text=Sample+Video+${i + 1}`,
          partnerId: partnerId,
          createdAt: new Date(Date.now() - i * 86400000).toISOString(), // Staggered dates
          views: 100 + i * 50
        }));
        res.send({ videos: mockVideos, page, pageSize, totalCount: mockVideos.length });
        return;
      }
      
      throw listError;
    }
  } catch (error) {
    console.error('Video list error:', error);
    res.status(500).json({
      error: 'Failed to list videos',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Health check endpoint
const healthHandler: RequestHandler = (_req: Request, res: Response): void => {
  res.send({ 
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
};

// Register routes
app.post('/api/token', tokenHandler);
app.post('/api/kaltura/session', sessionHandler);
app.get('/api/kaltura/video/:videoId', videoHandler);
app.get('/api/kaltura/videos/search', searchVideosHandler);
app.get('/api/kaltura/videos', listVideosHandler);
app.get('/api/health', healthHandler);

// Register error handler
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Kaltura Discord Activity server is listening on port ${port}!`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Endpoint: ${process.env.VITE_KALTURA_API_ENDPOINT}`);
});

export default app;