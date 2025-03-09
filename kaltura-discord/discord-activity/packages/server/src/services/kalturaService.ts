import axios from 'axios';
import { ApiClient, apiClient } from './apiClient';

/**
 * Options for generating a Kaltura Session
 */
export interface KalturaSessionOptions {
  /** Kaltura partner ID */
  partnerId: string;
  /** Admin secret for the partner */
  adminSecret: string;
  /** User ID to associate with the session (default: 'anonymous') */
  userId?: string;
  /** Session type (0 = USER, 2 = ADMIN) */
  type?: number;
  /** Session expiry in seconds */
  expiry?: number;
  /** Additional privileges for the session */
  privileges?: string;
  /** Entry ID for the session (optional) */
  entryId?: string;
}

/**
 * Video details interface
 */
export interface KalturaVideoDetails {
  /** Video entry ID */
  id: string;
  /** Video title */
  title: string;
  /** Video description */
  description: string;
  /** Video duration in seconds */
  duration: number;
  /** URL to the video thumbnail */
  thumbnailUrl: string;
  /** Partner ID that owns the video */
  partnerId: string;
  /** Creation timestamp */
  createdAt: string;
  /** View count */
  views: number;
  /** URL to play the video (optional) */
  playUrl?: string;
  /** User ID that owns the video (optional) */
  userId?: string;
}

/**
 * Authentication options for the API Gateway
 */
export interface AuthOptions {
  /** Discord user ID */
  discordId: string;
  /** Discord username */
  username: string;
  /** Discord roles */
  roles?: string[];
}

/**
 * Service for interacting with the Kaltura API
 */
export class KalturaService {
  private apiEndpoint: string;
  private apiClient: ApiClient;
  private useApiGateway: boolean;
  
  /**
   * Create a new KalturaService instance
   * @param apiEndpoint The Kaltura API endpoint URL
   * @param client The API client instance
   */
  constructor(apiEndpoint: string = 'https://www.kaltura.com/api_v3', client: ApiClient = apiClient) {
    this.apiEndpoint = apiEndpoint;
    this.apiClient = client;
    this.useApiGateway = !!process.env.API_GATEWAY_URL && process.env.ENABLE_API_GATEWAY !== 'false';
    
    console.log(`KalturaService initialized with ${this.useApiGateway ? 'API Gateway' : 'direct Kaltura API'} mode`);
    if (this.useApiGateway) {
      console.log(`API Gateway URL: ${process.env.API_GATEWAY_URL}`);
    } else {
      console.log(`Kaltura API Endpoint: ${this.apiEndpoint}`);
    }
  }
  
  /**
   * Authenticate with the API Gateway
   * @param options Authentication options
   * @returns A promise that resolves to the authentication token
   */
  async authenticate(options: AuthOptions): Promise<string> {
    if (!this.useApiGateway) {
      console.log('API Gateway not enabled, skipping authentication');
      return '';
    }
    
    try {
      console.log(`Authenticating with API Gateway for user ${options.discordId}`);
      
      const response = await this.apiClient.post<{ token: string }>('/auth/token', {
        discordId: options.discordId,
        username: options.username,
        roles: options.roles || []
      });
      
      this.apiClient.setToken(response.token);
      console.log('Authentication successful, token received');
      return response.token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate with API Gateway');
    }
  }
  
  /**
   * Safely convert a Unix timestamp to ISO string
   * @param timestamp Unix timestamp (seconds since epoch)
   * @returns ISO formatted date string or current date if invalid
   */
  private safeTimestampToISOString(timestamp: number | undefined): string {
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      return new Date().toISOString();
    }
    
    try {
      return new Date(timestamp * 1000).toISOString();
    } catch (error) {
      console.warn(`Invalid timestamp: ${timestamp}`, error);
      return new Date().toISOString();
    }
  }
  
  /**
   * Generate a Kaltura Session (KS)
   * @param options Session generation options
   * @returns A promise that resolves to the Kaltura Session string
   */
  async generateSession(options: KalturaSessionOptions): Promise<string> {
    try {
      console.log(`Generating Kaltura session for partner ${options.partnerId}`);
      
      // Use API Gateway if enabled
      if (this.useApiGateway) {
        try {
          console.log('Using API Gateway for session generation');
          
          // First ensure we have a valid token
          if (!this.apiClient.hasToken()) {
            console.log('No API token available, proceeding without authentication');
          }
          
          // Use the API Gateway to generate a session
          const response = await this.apiClient.post<{ ks: string }>(`/videos/${options.entryId || 'default'}/session`, {
            userId: options.userId || 'anonymous',
            type: options.type || 0,
            privileges: options.privileges || ''
          });
          
          console.log('Session generated successfully via API Gateway');
          return response.ks;
        } catch (apiError) {
          console.error('API Gateway session generation failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          
          // Fall back to direct Kaltura API if API Gateway fails
          if (process.env.NODE_ENV === 'production') {
            throw apiError; // In production, don't fall back
          }
        }
      }
      
      // Direct Kaltura API call
      console.log('Using direct Kaltura API for session generation');
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
      
      console.log('Kaltura session generated successfully via direct API');
      return response.data;
    } catch (error) {
      console.error('Error generating Kaltura session:', error);
      
      // Fallback to mock KS for development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock KS for development');
        return `mock_ks_${options.entryId || 'default'}_${options.userId || 'anonymous'}_${Date.now()}`;
      }
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        
        throw new Error(`Failed to generate Kaltura session (${statusCode}): ${errorMessage}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Get video details by entry ID
   * @param entryId The Kaltura entry ID
   * @param ks The Kaltura Session for authentication (optional when using API Gateway)
   * @returns A promise that resolves to the video details
   */
  async getVideoDetails(entryId: string, ks?: string): Promise<KalturaVideoDetails> {
    try {
      console.log(`Getting video details for entry ${entryId}`);
      
      // Use API Gateway if enabled
      if (this.useApiGateway) {
        try {
          console.log('Using API Gateway for video details');
          
          // Use the API Gateway to get video details
          const response = await this.apiClient.get<KalturaVideoDetails>(`/videos/${entryId}`);
          
          console.log('Video details retrieved successfully via API Gateway');
          return response;
        } catch (apiError) {
          console.error('API Gateway video details retrieval failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          
          // Fall back to direct Kaltura API if API Gateway fails
          if (process.env.NODE_ENV === 'production') {
            throw apiError; // In production, don't fall back
          }
        }
      }
      
      // Direct Kaltura API call (requires KS)
      if (!ks) {
        throw new Error('Kaltura Session (KS) is required for direct API calls');
      }
      
      console.log('Using direct Kaltura API for video details');
      const response = await axios.post(`${this.apiEndpoint}/service/media/action/get`, null, {
        params: {
          format: 1, // JSON
          ks,
          entryId
        }
      });
      
      console.log('Video details retrieved successfully via direct API');
      
      // Map the response to our KalturaVideoDetails interface
      return {
        id: response.data.id,
        title: response.data.name,
        description: response.data.description || '',
        duration: response.data.duration,
        thumbnailUrl: response.data.thumbnailUrl,
        partnerId: response.data.partnerId,
        createdAt: this.safeTimestampToISOString(response.data.createdAt),
        views: response.data.views || 0,
        userId: response.data.userId || 'anonymous'
      };
    } catch (error) {
      console.error('Error getting video details:', error);
      
      // Fallback to mock video for development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock video details for development');
        return {
          id: entryId,
          title: `Sample Video (${entryId})`,
          description: 'This is a sample video for development and testing purposes.',
          duration: 120,
          thumbnailUrl: 'https://via.placeholder.com/640x360?text=Sample+Video',
          partnerId: process.env.VITE_KALTURA_PARTNER_ID || '',
          createdAt: new Date().toISOString(),
          views: 100,
          userId: 'anonymous',
          playUrl: `https://example.com/play/${entryId}`
        };
      }
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        
        throw new Error(`Failed to get video details (${statusCode}): ${errorMessage}`);
      }
      
      throw error;
    }
  }
  
  /**
   * List videos for a partner
   * @param ks The Kaltura Session for authentication (optional when using API Gateway)
   * @param pageSize Number of items per page (default: 30)
   * @param page Page number (default: 1)
   * @returns A promise that resolves to an array of video details
   */
  async listVideos(ks?: string, pageSize: number = 30, page: number = 1): Promise<KalturaVideoDetails[]> {
    try {
      console.log(`Listing videos (page ${page}, pageSize ${pageSize})`);
      
      // Use API Gateway if enabled
      if (this.useApiGateway) {
        try {
          console.log('Using API Gateway for video listing');
          
          // Use the API Gateway to list videos
          const response = await this.apiClient.get<{ videos: KalturaVideoDetails[] }>('/videos', {
            params: { pageSize, page }
          });
          
          console.log(`Retrieved ${response.videos.length} videos via API Gateway`);
          return response.videos;
        } catch (apiError) {
          console.error('API Gateway video listing failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          
          // Fall back to direct Kaltura API if API Gateway fails
          if (process.env.NODE_ENV === 'production') {
            throw apiError; // In production, don't fall back
          }
        }
      }
      
      // Direct Kaltura API call (requires KS)
      if (!ks) {
        throw new Error('Kaltura Session (KS) is required for direct API calls');
      }
      
      console.log('Using direct Kaltura API for video listing');
      const response = await axios.post(`${this.apiEndpoint}/service/media/action/list`, null, {
        params: {
          format: 1, // JSON
          ks,
          'filter:objectType': 'KalturaMediaEntryFilter',
          'filter:orderBy': '-createdAt', // Sort by newest first
          'pager:objectType': 'KalturaFilterPager',
          'pager:pageSize': pageSize,
          'pager:pageIndex': page
        }
      });
      
      console.log(`Retrieved ${response.data.objects.length} videos via direct API`);
      
      // Map the response to our KalturaVideoDetails interface
      return response.data.objects.map((entry: any) => ({
        id: entry.id,
        title: entry.name,
        description: entry.description || '',
        duration: entry.duration,
        thumbnailUrl: entry.thumbnailUrl,
        partnerId: entry.partnerId,
        createdAt: this.safeTimestampToISOString(entry.createdAt),
        views: entry.views || 0,
        userId: entry.userId || 'anonymous'
      }));
    } catch (error) {
      console.error('Error listing videos:', error);
      
      // Fallback to mock videos for development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock videos for development');
        return Array.from({ length: 10 }, (_, i) => ({
          id: `mock_video_${i + 1}`,
          title: `Sample Video ${i + 1}`,
          description: `This is a sample video ${i + 1} for development and testing purposes.`,
          duration: 60 + i * 30,
          thumbnailUrl: `https://via.placeholder.com/640x360?text=Sample+Video+${i + 1}`,
          partnerId: process.env.VITE_KALTURA_PARTNER_ID || '',
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          views: 100 + i * 50,
          userId: 'anonymous',
          playUrl: `https://example.com/play/mock_video_${i + 1}`
        }));
      }
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        
        throw new Error(`Failed to list videos (${statusCode}): ${errorMessage}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Search for videos by text
   * @param ks The Kaltura Session for authentication (optional when using API Gateway)
   * @param searchText The text to search for
   * @param pageSize Number of items per page (default: 30)
   * @param page Page number (default: 1)
   * @returns A promise that resolves to an array of video details
   */
  async searchVideos(searchText: string, ks?: string, pageSize: number = 30, page: number = 1): Promise<KalturaVideoDetails[]> {
    try {
      console.log(`Searching videos for "${searchText}" (page ${page}, pageSize ${pageSize})`);
      
      // Use API Gateway if enabled
      if (this.useApiGateway) {
        try {
          console.log('Using API Gateway for video search');
          
          // Use the API Gateway to search videos
          const response = await this.apiClient.get<{ videos: KalturaVideoDetails[] }>('/videos/search', {
            params: { q: searchText, pageSize, page }
          });
          
          console.log(`Found ${response.videos.length} videos matching "${searchText}" via API Gateway`);
          return response.videos;
        } catch (apiError) {
          console.error('API Gateway video search failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          
          // Fall back to direct Kaltura API if API Gateway fails
          if (process.env.NODE_ENV === 'production') {
            throw apiError; // In production, don't fall back
          }
        }
      }
      
      // Direct Kaltura API call (requires KS)
      if (!ks) {
        throw new Error('Kaltura Session (KS) is required for direct API calls');
      }
      
      console.log('Using direct Kaltura API for video search');
      const response = await axios.post(`${this.apiEndpoint}/service/media/action/list`, null, {
        params: {
          format: 1, // JSON
          ks,
          'filter:objectType': 'KalturaMediaEntryFilter',
          'filter:freeText': searchText,
          'filter:orderBy': '-createdAt', // Sort by newest first
          'pager:objectType': 'KalturaFilterPager',
          'pager:pageSize': pageSize,
          'pager:pageIndex': page
        }
      });
      
      console.log(`Found ${response.data.objects.length} videos matching "${searchText}" via direct API`);
      
      // Map the response to our KalturaVideoDetails interface
      return response.data.objects.map((entry: any) => ({
        id: entry.id,
        title: entry.name,
        description: entry.description || '',
        duration: entry.duration,
        thumbnailUrl: entry.thumbnailUrl,
        partnerId: entry.partnerId,
        createdAt: this.safeTimestampToISOString(entry.createdAt),
        views: entry.views || 0,
        userId: entry.userId || 'anonymous'
      }));
    } catch (error) {
      console.error('Error searching videos:', error);
      
      // Fallback to mock videos for development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock videos for development');
        return Array.from({ length: 5 }, (_, i) => ({
          id: `mock_video_${i + 1}`,
          title: `Sample Video ${i + 1} - "${searchText}"`,
          description: `This is a sample video ${i + 1} for development and testing purposes.`,
          duration: 60 + i * 30,
          thumbnailUrl: `https://via.placeholder.com/640x360?text=Sample+Video+${i + 1}`,
          partnerId: process.env.VITE_KALTURA_PARTNER_ID || '',
          createdAt: new Date().toISOString(),
          views: 100 + i * 25,
          userId: 'anonymous',
          playUrl: `https://example.com/play/mock_video_${i + 1}`
        }));
      }
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        
        throw new Error(`Failed to search videos (${statusCode}): ${errorMessage}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Generate a play URL for a video
   * @param entryId The Kaltura entry ID
   * @returns A promise that resolves to the play URL
   */
  async generatePlayUrl(entryId: string): Promise<string> {
    try {
      console.log(`Generating play URL for entry ${entryId}`);
      
      // Use API Gateway if enabled
      if (this.useApiGateway) {
        try {
          console.log('Using API Gateway for play URL generation');
          
          // Use the API Gateway to generate a play URL
          const response = await this.apiClient.post<{ playUrl: string }>(`/videos/${entryId}/play`);
          
          console.log('Play URL generated successfully via API Gateway');
          return response.playUrl;
        } catch (apiError) {
          console.error('API Gateway play URL generation failed:', apiError);
          console.log('Falling back to direct Kaltura API');
          
          // Fall back to direct Kaltura API if API Gateway fails
          if (process.env.NODE_ENV === 'production') {
            throw apiError; // In production, don't fall back
          }
        }
      }
      
      // For direct Kaltura API, we would need to implement the play URL generation
      // This is typically done by generating a KS with specific privileges and constructing a URL
      // For simplicity, we'll return a mock URL in development
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock play URL for development');
        return `https://example.com/play/${entryId}?ks=mock_ks_${Date.now()}`;
      }
      
      throw new Error('Direct Kaltura API play URL generation not implemented');
    } catch (error) {
      console.error('Error generating play URL:', error);
      
      // Fallback to mock play URL for development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock play URL for development');
        return `https://example.com/play/${entryId}?ks=mock_ks_${Date.now()}`;
      }
      
      throw error;
    }
  }
}