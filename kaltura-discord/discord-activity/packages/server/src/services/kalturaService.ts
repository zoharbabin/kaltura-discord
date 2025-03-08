import axios from 'axios';

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
}

/**
 * Service for interacting with the Kaltura API
 */
export class KalturaService {
  private apiEndpoint: string;
  
  /**
   * Create a new KalturaService instance
   * @param apiEndpoint The Kaltura API endpoint URL
   */
  constructor(apiEndpoint: string = 'https://www.kaltura.com/api_v3') {
    this.apiEndpoint = apiEndpoint;
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
      
      console.log('Kaltura session generated successfully');
      return response.data;
    } catch (error) {
      console.error('Error generating Kaltura session:', error);
      
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
   * @param ks The Kaltura Session for authentication
   * @returns A promise that resolves to the video details
   */
  async getVideoDetails(entryId: string, ks: string): Promise<KalturaVideoDetails> {
    try {
      console.log(`Getting video details for entry ${entryId}`);
      
      const response = await axios.post(`${this.apiEndpoint}/service/media/action/get`, null, {
        params: {
          format: 1, // JSON
          ks,
          entryId
        }
      });
      
      console.log('Video details retrieved successfully');
      
      // Map the response to our KalturaVideoDetails interface
      return {
        id: response.data.id,
        title: response.data.name,
        description: response.data.description || '',
        duration: response.data.duration,
        thumbnailUrl: response.data.thumbnailUrl,
        partnerId: response.data.partnerId,
        createdAt: this.safeTimestampToISOString(response.data.createdAt),
        views: response.data.views || 0
      };
    } catch (error) {
      console.error('Error getting video details:', error);
      
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
   * @param ks The Kaltura Session for authentication
   * @param pageSize Number of items per page (default: 30)
   * @param page Page number (default: 1)
   * @returns A promise that resolves to an array of video details
   */
  async listVideos(ks: string, pageSize: number = 30, page: number = 1): Promise<KalturaVideoDetails[]> {
    try {
      console.log(`Listing videos (page ${page}, pageSize ${pageSize})`);
      
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
      
      console.log(`Retrieved ${response.data.objects.length} videos`);
      
      // Map the response to our KalturaVideoDetails interface
      return response.data.objects.map((entry: any) => ({
        id: entry.id,
        title: entry.name,
        description: entry.description || '',
        duration: entry.duration,
        thumbnailUrl: entry.thumbnailUrl,
        partnerId: entry.partnerId,
        createdAt: this.safeTimestampToISOString(entry.createdAt),
        views: entry.views || 0
      }));
    } catch (error) {
      console.error('Error listing videos:', error);
      
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
   * @param ks The Kaltura Session for authentication
   * @param searchText The text to search for
   * @param pageSize Number of items per page (default: 30)
   * @param page Page number (default: 1)
   * @returns A promise that resolves to an array of video details
   */
  async searchVideos(ks: string, searchText: string, pageSize: number = 30, page: number = 1): Promise<KalturaVideoDetails[]> {
    try {
      console.log(`Searching videos for "${searchText}" (page ${page}, pageSize ${pageSize})`);
      
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
      
      console.log(`Found ${response.data.objects.length} videos matching "${searchText}"`);
      
      // Map the response to our KalturaVideoDetails interface
      return response.data.objects.map((entry: any) => ({
        id: entry.id,
        title: entry.name,
        description: entry.description || '',
        duration: entry.duration,
        thumbnailUrl: entry.thumbnailUrl,
        partnerId: entry.partnerId,
        createdAt: this.safeTimestampToISOString(entry.createdAt),
        views: entry.views || 0
      }));
    } catch (error) {
      console.error('Error searching videos:', error);
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        
        throw new Error(`Failed to search videos (${statusCode}): ${errorMessage}`);
      }
      
      throw error;
    }
  }
}