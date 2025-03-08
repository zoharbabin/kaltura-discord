import axios, { AxiosInstance } from 'axios';
import { logger } from '../common/logger';
import { configService } from './configService';
import { getEnv } from '../common/envService';

/**
 * Interface for Kaltura session data
 */
export interface KalturaSession {
  ks: string;
  partnerId: string;
  userId: string;
  expiry: number;
  privileges: string;
}

/**
 * Interface for meeting creation parameters
 */
export interface MeetingCreateParams {
  title: string;
  description?: string;
  type: 'webinar' | 'meeting' | 'classroom';
  ownerId: string;
}

/**
 * Interface for meeting data
 */
export interface Meeting {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  ownerId: string;
  createdAt: Date;
  joinUrl: string;
}

/**
 * Interface for video data
 */
export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  duration: number;
  createdAt: Date;
  views: number;
  userId: string;
  playUrl: string;
}

/**
 * Interface for video search parameters
 */
export interface VideoSearchParams {
  freeText?: string;
  limit?: number;
  page?: number;
  userId?: string; // Discord username for the session
}

/**
 * Kaltura API Client for interacting with Kaltura's APIs
 */
export class KalturaClient {
  private axiosInstance: AxiosInstance;
  private partnerId: string;
  private adminSecret: string;
  private apiEndpoint: string;
  private useMockResponses: boolean;
  private currentSession: KalturaSession | null = null;

  /**
   * Create a new Kaltura API client
   */
  constructor() {
    // Get environment variables with .env file priority
    this.partnerId = getEnv('KALTURA_PARTNER_ID', '');
    this.adminSecret = getEnv('KALTURA_ADMIN_SECRET', '');
    this.apiEndpoint = getEnv('KALTURA_API_ENDPOINT', 'https://www.kaltura.com/api_v3');
    
    // Log the partnerId being used for debugging
    logger.debug('Initializing Kaltura client with partnerId', {
      partnerId: this.partnerId,
      partnerId_type: typeof this.partnerId
    });
    
    // Check if we have valid Kaltura credentials
    this.useMockResponses = !this.partnerId ||
                           !this.adminSecret ||
                           this.partnerId === 'your_kaltura_partner_id' ||
                           this.adminSecret === 'your_kaltura_admin_secret';
    
    if (this.useMockResponses) {
      logger.warn('Using mock responses for Kaltura API calls');
    }
    
    // Create axios instance for API calls
    this.axiosInstance = axios.create({
      baseURL: this.apiEndpoint,
      timeout: 10000,
      params: {
        clientTag: 'discordbot'
      }
    });
    
    // Add request interceptor to log API calls
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Log the complete API call
        logger.debug('Kaltura API call', {
          url: config.url,
          method: config.method,
          data: config.data,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        logger.error('Kaltura API request error', { error });
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor to log responses
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('Kaltura API response', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });
        return response;
      },
      (error) => {
        logger.error('Kaltura API response error', { 
          error,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : 'No response'
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get the current Kaltura Session
   * @returns The current Kaltura Session or null if none exists
   */
  getCurrentSession(): KalturaSession | null {
    return this.currentSession;
  }

  /**
   * Generate a Kaltura Session (KS) for authentication
   * @param userId The user ID to associate with the session
   * @param type The session type (0 for user, 2 for admin)
   * @param expiry Session expiry in seconds (default: 86400 = 24 hours)
   * @param privileges Additional privileges for the session
   * @param sessionType Type of session to generate (default, video, meeting)
   * @returns A promise resolving to the Kaltura Session
   */
  async generateSession(
    userId: string,
    type: 0 | 2 = 0,
    expiry: number = 86400,
    privileges: string = '',
    sessionType: 'default' | 'video' | 'meeting' = 'default'
  ): Promise<KalturaSession> {
    try {
      if (this.useMockResponses) {
        const session = await this.mockGenerateSession(userId, type, expiry, privileges);
        this.currentSession = session;
        return session;
      }
      
      // Get server configuration for session privileges
      const config = await configService.getServerConfig('default');
      
      // Get the appropriate privileges for the session type
      let sessionPrivileges = privileges;
      
      if (config.kaltura?.session?.privileges) {
        const configPrivileges = config.kaltura.session.privileges[sessionType] || '';
        
        // Combine provided privileges with configuration privileges
        if (configPrivileges) {
          sessionPrivileges = privileges ?
            `${privileges},${configPrivileges}` :
            configPrivileges;
        }
      }
      
      logger.debug('Generating Kaltura session', {
        userId,
        type,
        sessionType,
        privileges: sessionPrivileges
      });
      
      // This API call structure matches the curl command format:
      // curl -X POST "https://www.kaltura.com/api_v3/service/session/action/start" \
      //      -H "Content-Type: application/json" \
      //      -d '{
      //            "format": 1,
      //            "secret": "***",
      //            "userId": "discord-user-id",
      //            "type": 0,
      //            "partnerId": 5896392,
      //            "expiry": 86400,
      //            "privileges": "genieid:default,privacycontext:*,virtualeventid:*,virtualeventid:*,privacycontext:*"
      //          }'
      logger.debug('Using partnerId for API call', {
        partnerId: this.partnerId,
        type: typeof this.partnerId
      });
      
      const response = await this.axiosInstance.post('/service/session/action/start', {
        format: 1, // JSON format
        partnerId: parseInt(this.partnerId), // Convert to integer
        secret: this.adminSecret,
        type,
        userId,
        expiry,
        privileges: sessionPrivileges,
      });
      
      // Ensure the KS is a string
      const ks = typeof response.data === 'object' ? JSON.stringify(response.data) : response.data;
      
      logger.debug('Received KS from API', {
        ks_type: typeof ks,
        ks_value: ks
      });
      
      const session = {
        ks,
        partnerId: this.partnerId,
        userId,
        expiry: Math.floor(Date.now() / 1000) + expiry,
        privileges: sessionPrivileges || '',
      };
      
      this.currentSession = session;
      return session;
    } catch (error) {
      logger.error('Failed to generate Kaltura session', { error, userId, sessionType });
      throw new Error('Failed to generate Kaltura session');
    }
  }

  /**
   * Create a new meeting
   * @param params Meeting creation parameters
   * @returns A promise resolving to the created meeting
   */
  async createMeeting(params: MeetingCreateParams): Promise<Meeting> {
    try {
      if (this.useMockResponses) {
        return this.mockCreateMeeting(params);
      }
      
      // First, generate an admin session
      const adminSession = await this.generateSession(params.ownerId, 2, 86400, '', 'meeting');
      
      // Create the meeting based on type
      let response;
      switch (params.type) {
        case 'webinar':
          response = await this.createWebinar(adminSession.ks, params);
          break;
        case 'meeting':
          response = await this.createInteractiveMeeting(adminSession.ks, params);
          break;
        case 'classroom':
          response = await this.createVirtualClassroom(adminSession.ks, params);
          break;
        default:
          throw new Error(`Invalid meeting type: ${params.type}`);
      }
      
      return response;
    } catch (error) {
      logger.error('Failed to create meeting', { error, params });
      throw new Error('Failed to create meeting');
    }
  }

  /**
   * Get a meeting by ID
   * @param meetingId The meeting ID
   * @returns A promise resolving to the meeting data
   */
  async getMeeting(meetingId: string): Promise<Meeting> {
    try {
      if (this.useMockResponses) {
        return this.mockGetMeeting(meetingId);
      }
      
      // Generate an admin session
      const adminSession = await this.generateSession('admin', 2, 86400, '', 'meeting');
      
      // Get the meeting
      const response = await this.axiosInstance.post('/service/virtualEvent/action/get', {
        format: 1, // JSON format
        ks: adminSession.ks,
        id: meetingId,
      });
      
      // Transform the response to our Meeting interface
      return this.transformKalturaMeetingToMeeting(response.data);
    } catch (error) {
      logger.error('Failed to get meeting', { error, meetingId });
      throw new Error('Failed to get meeting');
    }
  }

  /**
   * List all active meetings
   * @param ownerId Optional owner ID to filter by
   * @returns A promise resolving to an array of meetings
   */
  async listMeetings(ownerId?: string): Promise<Meeting[]> {
    try {
      if (this.useMockResponses) {
        return this.mockListMeetings(ownerId);
      }
      
      // Generate an admin session
      const adminSession = await this.generateSession('admin', 2, 86400, '', 'meeting');
      
      // Build the filter
      const filter: any = {
        statusEqual: 1, // Active meetings
      };
      
      if (ownerId) {
        filter.userIdEqual = ownerId;
      }
      
      // List the meetings
      const response = await this.axiosInstance.post('/service/virtualEvent/action/list', {
        format: 1, // JSON format
        ks: adminSession.ks,
        filter,
      });
      
      // Transform the response to our Meeting interface
      // Check if response.data.objects exists before mapping
      if (!response.data || !response.data.objects) {
        return []; // Return empty array if no meetings found
      }
      return response.data.objects.map((meeting: any) => this.transformKalturaMeetingToMeeting(meeting));
    } catch (error) {
      // Create a more detailed error message
      const errorMessage = error instanceof Error
        ? `Failed to list meetings: ${error.message}`
        : 'Failed to list meetings: Unknown error';
      
      logger.error(errorMessage, { error, ownerId });
      throw new Error(errorMessage);
    }
  }

  /**
   * End a meeting
   * @param meetingId The meeting ID
   * @returns A promise resolving to true if successful
   */
  async endMeeting(meetingId: string): Promise<boolean> {
    try {
      if (this.useMockResponses) {
        return this.mockEndMeeting(meetingId);
      }
      
      // Generate an admin session
      const adminSession = await this.generateSession('admin', 2, 86400, '', 'meeting');
      
      // End the meeting
      await this.axiosInstance.post('/service/virtualEvent/action/end', {
        format: 1, // JSON format
        ks: adminSession.ks,
        id: meetingId,
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to end meeting', { error, meetingId });
      throw new Error('Failed to end meeting');
    }
  }

  /**
   * Generate a join URL for a meeting
   * @param meetingId The meeting ID
   * @param userId The user ID
   * @param role The user role (0 for viewer, 1 for moderator)
   * @returns A promise resolving to the join URL
   */
  async generateJoinUrl(meetingId: string, userId: string, role: 0 | 1 = 0): Promise<string> {
    try {
      if (this.useMockResponses) {
        return this.mockGenerateJoinUrl(meetingId, userId, role);
      }
      
      // Generate a user session with appropriate privileges
      const privileges = role === 1 ? 'moderator' : '';
      const userSession = await this.generateSession(userId, 0, 3600, privileges, 'meeting');
      
      // Generate the join URL
      const joinUrl = `${this.apiEndpoint}/virtualEvent/join?ks=${userSession.ks}&id=${meetingId}`;
      
      return joinUrl;
    } catch (error) {
      logger.error('Failed to generate join URL', { error, meetingId, userId });
      throw new Error('Failed to generate join URL');
    }
  }

  /**
   * Search for videos using Kaltura eSearch API
   * @param params Search parameters
   * @returns A promise resolving to an array of videos
   */
  async searchVideos(params: VideoSearchParams): Promise<Video[]> {
    try {
      if (this.useMockResponses) {
        return this.mockSearchVideos(params);
      }
      
      // Use the Discord username if available, otherwise use a generic name
      const userId = params.userId || 'discord_user';
      
      // Generate a user session (type=0) with video-specific privileges
      const userSession = await this.generateSession(userId, 0, 86400, '', 'video');
      
      logger.debug('Searching videos with session', {
        userId,
        sessionType: 'USER (0)',
        privileges: userSession.privileges,
        params
      });
      
      // Build the eSearch request
      const searchParams: any = {
        objectType: "KalturaESearchEntryParams",
        searchOperator: {
          objectType: "KalturaESearchEntryOperator",
          operator: 1, // AND
          searchItems: []
        }
      };
      
      // Add free text search if provided
      if (params.freeText) {
        searchParams.searchOperator.searchItems.push({
          objectType: "KalturaESearchUnifiedItem",
          searchTerm: params.freeText,
          addHighlight: true,
          itemType: 2 // More flexible search mode (instead of EXACT_MATCH)
        });
      }
      
      // Set pagination
      const pager = {
        objectType: "KalturaFilterPager",
        pageSize: params.limit || 10,
        pageIndex: params.page || 1
      };
      
      // Execute the search
      const response = await this.axiosInstance.post('/service/elasticsearch_esearch/action/searchEntry', {
        format: 1, // JSON format
        ks: userSession.ks,
        searchParams,
        pager,
        clientTag: 'discordbot'
      });
      // Transform the response to our Video interface
      if (!response.data || !response.data.objects) {
        return []; // Return empty array if no videos found
      }
      
      // Handle the response structure from elasticsearch_esearch endpoint
      // Each object in the array has an 'object' property containing the actual entry data
      return response.data.objects.map((result: any) => {
        // Extract the entry data from the result object
        const entry = result.object || result;
        return this.transformKalturaEntryToVideo(entry);
      });
      return response.data.objects.map((entry: any) => this.transformKalturaEntryToVideo(entry));
    } catch (error) {
      // Create a more detailed error message
      const errorMessage = error instanceof Error
        ? `Failed to search videos: ${error.message}`
        : 'Failed to search videos: Unknown error';
      
      logger.error(errorMessage, { error, params });
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a video by ID
   * @param videoId The video ID
   * @returns A promise resolving to the video data
   */
  async getVideo(videoId: string): Promise<Video> {
    try {
      if (this.useMockResponses) {
        return this.mockGetVideo(videoId);
      }
      
      // Use the Discord username if available, otherwise use a generic name
      const userId = 'discord_user';
      
      // Generate a user session (type=0) with video-specific privileges
      const userSession = await this.generateSession(userId, 0, 86400, '', 'video');
      
      logger.debug('Getting video with session', {
        userId,
        sessionType: 'USER (0)',
        privileges: userSession.privileges,
        videoId
      });
      
      // Get the video
      const response = await this.axiosInstance.post('/service/media/action/get', {
        format: 1, // JSON format
        ks: userSession.ks,
        entryId: videoId,
        clientTag: 'discordbot'
      });
      
      // Transform the response to our Video interface
      return this.transformKalturaEntryToVideo(response.data);
    } catch (error) {
      logger.error('Failed to get video', { error, videoId });
      throw new Error('Failed to get video');
    }
  }

  /**
   * Generate a play URL for a video
   * @param videoId The video ID
   * @param userId The user ID
   * @returns A promise resolving to the play URL
   */
  async generateVideoPlayUrl(videoId: string, userId: string): Promise<string> {
    try {
      if (this.useMockResponses) {
        return this.mockGenerateVideoPlayUrl(videoId, userId);
      }
      
      // Generate a user session with video-specific privileges
      const userSession = await this.generateSession(userId, 0, 3600, '', 'video');
      
      logger.debug('Generating video play URL with session', { 
        privileges: userSession.privileges,
        videoId,
        userId
      });
      
      // Get the player ID from environment variable or use a default
      const playerId = getEnv('KALTURA_PLAYER_ID', '46022343');
      
      // Generate the play URL
      const playUrl = `${this.apiEndpoint}/p/${this.partnerId}/embedPlaykitJs/uiconf_id/${playerId}?ks=${userSession.ks}&entry_id=${videoId}`;
      
      return playUrl;
    } catch (error) {
      logger.error('Failed to generate video play URL', { error, videoId, userId });
      throw new Error('Failed to generate video play URL');
    }
  }

  // Private methods for specific meeting types
  
  private async createWebinar(ks: string, params: MeetingCreateParams): Promise<Meeting> {
    const response = await this.axiosInstance.post('/service/virtualEvent/action/add', {
      format: 1, // JSON format
      ks,
      virtualEvent: {
        name: params.title,
        description: params.description || '',
        type: 1, // Webinar
        userId: params.ownerId,
      },
    });
    
    return this.transformKalturaMeetingToMeeting(response.data);
  }
  
  private async createInteractiveMeeting(ks: string, params: MeetingCreateParams): Promise<Meeting> {
    const response = await this.axiosInstance.post('/service/virtualEvent/action/add', {
      format: 1, // JSON format
      ks,
      virtualEvent: {
        name: params.title,
        description: params.description || '',
        type: 2, // Interactive Meeting
        userId: params.ownerId,
      },
    });
    
    return this.transformKalturaMeetingToMeeting(response.data);
  }
  
  private async createVirtualClassroom(ks: string, params: MeetingCreateParams): Promise<Meeting> {
    const response = await this.axiosInstance.post('/service/virtualEvent/action/add', {
      format: 1, // JSON format
      ks,
      virtualEvent: {
        name: params.title,
        description: params.description || '',
        type: 3, // Virtual Classroom
        userId: params.ownerId,
      },
    });
    
    return this.transformKalturaMeetingToMeeting(response.data);
  }
  
  // Helper methods for transforming data
  
  private transformKalturaMeetingToMeeting(kalturaMeeting: any): Meeting {
    return {
      id: kalturaMeeting.id,
      title: kalturaMeeting.name,
      description: kalturaMeeting.description,
      type: this.getMeetingTypeString(kalturaMeeting.type),
      status: kalturaMeeting.status === 1 ? 'active' : 'ended',
      ownerId: kalturaMeeting.userId,
      createdAt: new Date(kalturaMeeting.createdAt * 1000),
      joinUrl: `${this.apiEndpoint}/virtualEvent/join?id=${kalturaMeeting.id}`,
    };
  }
  
  private getMeetingTypeString(type: number): string {
    switch (type) {
      case 1:
        return 'webinar';
      case 2:
        return 'meeting';
      case 3:
        return 'classroom';
      default:
        return 'unknown';
    }
  }
  
  // Mock methods for development without Kaltura API access
  
  private mockGenerateSession(
    userId: string,
    type: 0 | 2,
    expiry: number,
    privileges: string
  ): Promise<KalturaSession> {
    return Promise.resolve({
      ks: `mock_ks_${Math.random().toString(36).substring(2, 15)}`,
      partnerId: '12345',
      userId,
      expiry: Math.floor(Date.now() / 1000) + expiry,
      privileges,
    });
  }
  
  private mockCreateMeeting(params: MeetingCreateParams): Promise<Meeting> {
    const meetingId = Math.random().toString(36).substring(2, 15);
    
    return Promise.resolve({
      id: meetingId,
      title: params.title,
      description: params.description,
      type: params.type,
      status: 'active',
      ownerId: params.ownerId,
      createdAt: new Date(),
      joinUrl: `https://mock-kaltura.com/join/${meetingId}`,
    });
  }
  
  private mockGetMeeting(meetingId: string): Promise<Meeting> {
    return Promise.resolve({
      id: meetingId,
      title: `Mock Meeting ${meetingId}`,
      description: 'This is a mock meeting for development',
      type: 'meeting',
      status: 'active',
      ownerId: 'mock-user',
      createdAt: new Date(),
      joinUrl: `https://mock-kaltura.com/join/${meetingId}`,
    });
  }
  
  private mockListMeetings(ownerId?: string): Promise<Meeting[]> {
    const meetings: Meeting[] = [];
    
    // Generate 3 mock meetings
    for (let i = 0; i < 3; i++) {
      const meetingId = Math.random().toString(36).substring(2, 15);
      const types = ['webinar', 'meeting', 'classroom'] as const;
      
      meetings.push({
        id: meetingId,
        title: `Mock Meeting ${i + 1}`,
        description: `This is mock meeting ${i + 1} for development`,
        type: types[i % 3],
        status: 'active',
        ownerId: ownerId || 'mock-user',
        createdAt: new Date(Date.now() - i * 3600000), // Each meeting created 1 hour apart
        joinUrl: `https://mock-kaltura.com/join/${meetingId}`,
      });
    }
    
    return Promise.resolve(meetings);
  }
  
  private mockEndMeeting(meetingId: string): Promise<boolean> {
    return Promise.resolve(true);
  }
  
  private mockGenerateJoinUrl(meetingId: string, userId: string, role: 0 | 1): Promise<string> {
    const roleStr = role === 1 ? 'moderator' : 'viewer';
    return Promise.resolve(`https://mock-kaltura.com/join/${meetingId}?user=${userId}&role=${roleStr}`);
  }

  private mockSearchVideos(params: VideoSearchParams): Promise<Video[]> {
    const videos: Video[] = [];
    
    // Generate 5 mock videos
    for (let i = 0; i < 5; i++) {
      const videoId = Math.random().toString(36).substring(2, 15);
      
      videos.push({
        id: videoId,
        title: `Mock Video ${i + 1}${params.freeText ? ` - ${params.freeText}` : ''}`,
        description: `This is mock video ${i + 1} for development${params.freeText ? ` matching "${params.freeText}"` : ''}`,
        thumbnailUrl: `https://mock-kaltura.com/thumbnail/${videoId}.jpg`,
        duration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
        createdAt: new Date(Date.now() - i * 86400000), // Each video created 1 day apart
        views: Math.floor(Math.random() * 1000),
        userId: 'mock-user',
        playUrl: `https://mock-kaltura.com/play/${videoId}`,
      });
    }
    
    return Promise.resolve(videos);
  }

  private mockGetVideo(videoId: string): Promise<Video> {
    return Promise.resolve({
      id: videoId,
      title: `Mock Video ${videoId}`,
      description: 'This is a mock video for development',
      thumbnailUrl: `https://mock-kaltura.com/thumbnail/${videoId}.jpg`,
      duration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
      createdAt: new Date(),
      views: Math.floor(Math.random() * 1000),
      userId: 'mock-user',
      playUrl: `https://mock-kaltura.com/play/${videoId}`,
    });
  }

  private mockGenerateVideoPlayUrl(videoId: string, userId: string): Promise<string> {
    return Promise.resolve(`https://mock-kaltura.com/play/${videoId}?user=${userId}`);
  }

  private transformKalturaEntryToVideo(kalturaEntry: any): Video {
    // Get the player ID from environment variable or use a default
    const playerId = getEnv('KALTURA_PLAYER_ID', '46022343');
    
    return {
      id: kalturaEntry.id,
      title: kalturaEntry.name,
      description: kalturaEntry.description,
      thumbnailUrl: kalturaEntry.thumbnailUrl || `${this.apiEndpoint}/p/${this.partnerId}/thumbnail/entry_id/${kalturaEntry.id}`,
      duration: kalturaEntry.duration || 0,
      createdAt: new Date(kalturaEntry.createdAt * 1000),
      views: kalturaEntry.views || 0,
      userId: kalturaEntry.userId,
      playUrl: `${this.apiEndpoint}/p/${this.partnerId}/embedPlaykitJs/uiconf_id/${playerId}?entry_id=${kalturaEntry.id}`,
    };
  }
}

// Export a singleton instance
export const kalturaClient = new KalturaClient();