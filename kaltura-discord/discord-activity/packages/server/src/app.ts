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
import { apiClient } from './services/apiClient';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: `../../.env.${nodeEnv}` });

const app: Application = express();
const port: number = Number(process.env.PORT) || 3001;

// Initialize API client with API Gateway URL
const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000/api';
console.log(`Using API Gateway at: ${apiGatewayUrl}`);

// Initialize Kaltura service with API client
const kalturaService = new KalturaService(process.env.VITE_KALTURA_API_ENDPOINT, apiClient);

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

// Serve static files in all environments
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// For SPA routing, serve index.html for any unmatched routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve index.html for all other routes
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

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
    // Exchange Discord code for token
    const { code } = req.body;
    
    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }
    
    // Exchange code for Discord token
    const response = await fetchAndRetry('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_CLIENT_ID || '',
        client_secret: process.env.CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code,
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
    
    // Get user information from Discord
    const userResponse = await fetchAndRetry('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    
    if (!userResponse.ok) {
      console.error('Failed to get user information from Discord');
      res.status(userResponse.status).json({
        error: 'Failed to get user information'
      });
      return;
    }
    
    interface DiscordUser {
      id: string;
      username: string;
      discriminator?: string;
      avatar?: string;
      roles?: string[];
    }
    
    const userData = await userResponse.json() as DiscordUser;
    
    // Authenticate with API Gateway if enabled
    let api_token = '';
    if (process.env.API_GATEWAY_URL && process.env.ENABLE_API_GATEWAY !== 'false') {
      try {
        api_token = await kalturaService.authenticate({
          discordId: userData.id,
          username: userData.username,
          roles: userData.roles || []
        });
        console.log('API Gateway authentication successful');
      } catch (apiError) {
        console.error('API Gateway authentication failed:', apiError);
        // Continue without API token
      }
    }
    
    // Return both tokens to the client
    const responseData: any = { access_token, token_type, expires_in, scope };
    if (api_token) {
      responseData.api_token = api_token;
    }
    
    res.send(responseData);
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
    
    try {
      // Generate a Kaltura session using the updated KalturaService
      // This will use the API Gateway if enabled, or fall back to direct Kaltura API
      const ks = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        userId: userId || 'anonymous',
        type: 0, // USER session
        privileges: `sview:${videoId}`, // Add privileges to view this specific entry
        entryId: videoId // Pass the entry ID for API Gateway
      });
      
      res.send({ ks });
    } catch (error) {
      console.error('KS generation error:', error);
      
      // Error is already handled in KalturaService with fallbacks for development
      if (error instanceof Error) {
        res.status(500).json({
          error: 'Failed to generate Kaltura session',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Failed to generate Kaltura session',
          message: 'Unknown error'
        });
      }
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
    
    try {
      // Try to get video details using the API Gateway first
      if (process.env.API_GATEWAY_URL && process.env.ENABLE_API_GATEWAY !== 'false') {
        try {
          console.log('Using API Gateway for video details');
          const video = await kalturaService.getVideoDetails(videoId);
          res.send(video);
          return;
        } catch (apiError) {
          console.error('API Gateway video details retrieval failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          // Continue to direct API approach
        }
      }
      
      // Generate an admin KS for direct API access
      const adminKs = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        type: 2, // ADMIN session
        entryId: videoId
      });
      
      // Get video details
      const video = await kalturaService.getVideoDetails(videoId, adminKs);
      
      // Add play URL if not already present
      if (!video.playUrl) {
        try {
          video.playUrl = await kalturaService.generatePlayUrl(videoId);
        } catch (playUrlError) {
          console.error('Failed to generate play URL:', playUrlError);
          // Continue without play URL
        }
      }
      
      res.send(video);
    } catch (error) {
      console.error('Video details error:', error);
      
      // Error handling is already implemented in KalturaService with fallbacks for development
      if (error instanceof Error) {
        res.status(500).json({
          error: 'Failed to get video details',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Failed to get video details',
          message: 'Unknown error'
        });
      }
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
    
    try {
      // Try to search videos using the API Gateway first
      if (process.env.API_GATEWAY_URL && process.env.ENABLE_API_GATEWAY !== 'false') {
        try {
          console.log('Using API Gateway for video search');
          const videos = await kalturaService.searchVideos(query);
          res.send({ videos, page, pageSize, totalCount: videos.length });
          return;
        } catch (apiError) {
          console.error('API Gateway video search failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          // Continue to direct API approach
        }
      }
      
      // Generate an admin KS for direct API access
      const adminKs = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        type: 2, // ADMIN session
      });
      
      // Search videos
      const videos = await kalturaService.searchVideos(query, adminKs, pageSize, page);
      
      // Add play URLs if not already present
      for (const video of videos) {
        if (!video.playUrl) {
          try {
            video.playUrl = await kalturaService.generatePlayUrl(video.id);
          } catch (playUrlError) {
            console.error(`Failed to generate play URL for video ${video.id}:`, playUrlError);
            // Continue without play URL
          }
        }
      }
      
      res.send({ videos, page, pageSize, totalCount: videos.length });
    } catch (error) {
      console.error('Video search error:', error);
      
      // Error handling is already implemented in KalturaService with fallbacks for development
      if (error instanceof Error) {
        res.status(500).json({
          error: 'Failed to search videos',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Failed to search videos',
          message: 'Unknown error'
        });
      }
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
    
    try {
      // Try to list videos using the API Gateway first
      if (process.env.API_GATEWAY_URL && process.env.ENABLE_API_GATEWAY !== 'false') {
        try {
          console.log('Using API Gateway for video listing');
          const videos = await kalturaService.listVideos(undefined, pageSize, page);
          res.send({ videos, page, pageSize, totalCount: videos.length });
          return;
        } catch (apiError) {
          console.error('API Gateway video listing failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          // Continue to direct API approach
        }
      }
      
      // Generate an admin KS for direct API access
      const adminKs = await kalturaService.generateSession({
        partnerId,
        adminSecret,
        type: 2, // ADMIN session
      });
      
      // List videos
      const videos = await kalturaService.listVideos(adminKs, pageSize, page);
      
      // Add play URLs if not already present
      for (const video of videos) {
        if (!video.playUrl) {
          try {
            video.playUrl = await kalturaService.generatePlayUrl(video.id);
          } catch (playUrlError) {
            console.error(`Failed to generate play URL for video ${video.id}:`, playUrlError);
            // Continue without play URL
          }
        }
      }
      
      res.send({ videos, page, pageSize, totalCount: videos.length });
    } catch (error) {
      console.error('Video list error:', error);
      
      // Error handling is already implemented in KalturaService with fallbacks for development
      if (error instanceof Error) {
        res.status(500).json({
          error: 'Failed to list videos',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Failed to list videos',
          message: 'Unknown error'
        });
      }
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

// Generate play URL for a video
const playUrlHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }
    
    try {
      // Generate play URL using the KalturaService
      const playUrl = await kalturaService.generatePlayUrl(videoId);
      res.send({ playUrl });
    } catch (error) {
      console.error('Play URL generation error:', error);
      
      // Error handling is already implemented in KalturaService with fallbacks for development
      if (error instanceof Error) {
        res.status(500).json({
          error: 'Failed to generate play URL',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Failed to generate play URL',
          message: 'Unknown error'
        });
      }
    }
  } catch (error) {
    console.error('Play URL generation error:', error);
    res.status(500).json({
      error: 'Failed to generate play URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Register routes
app.post('/api/token', tokenHandler);
app.post('/api/kaltura/session', sessionHandler);
app.get('/api/kaltura/video/:videoId', videoHandler);
app.post('/api/kaltura/video/:videoId/play', playUrlHandler);
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