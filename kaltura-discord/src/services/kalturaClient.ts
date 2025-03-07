import axios, { AxiosInstance } from 'axios';
import { logger } from '../common/logger';

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
 * Kaltura API Client for interacting with Kaltura's APIs
 */
export class KalturaClient {
  private axiosInstance: AxiosInstance;
  private partnerId: string;
  private adminSecret: string;
  private apiEndpoint: string;
  private useMockResponses: boolean;

  /**
   * Create a new Kaltura API client
   */
  constructor() {
    this.partnerId = process.env.KALTURA_PARTNER_ID || '';
    this.adminSecret = process.env.KALTURA_ADMIN_SECRET || '';
    this.apiEndpoint = process.env.KALTURA_API_ENDPOINT || 'https://www.kaltura.com/api_v3';
    
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
    });
  }

  /**
   * Generate a Kaltura Session (KS) for authentication
   * @param userId The user ID to associate with the session
   * @param type The session type (0 for user, 2 for admin)
   * @param expiry Session expiry in seconds (default: 86400 = 24 hours)
   * @param privileges Additional privileges for the session
   * @returns A promise resolving to the Kaltura Session
   */
  async generateSession(
    userId: string,
    type: 0 | 2 = 0,
    expiry: number = 86400,
    privileges: string = ''
  ): Promise<KalturaSession> {
    try {
      if (this.useMockResponses) {
        return this.mockGenerateSession(userId, type, expiry, privileges);
      }
      
      const response = await this.axiosInstance.post('/service/session/action/start', {
        format: 1, // JSON format
        partnerId: this.partnerId,
        secret: this.adminSecret,
        type,
        userId,
        expiry,
        privileges,
      });
      
      const ks = response.data;
      
      return {
        ks,
        partnerId: this.partnerId,
        userId,
        expiry: Math.floor(Date.now() / 1000) + expiry,
        privileges,
      };
    } catch (error) {
      logger.error('Failed to generate Kaltura session', { error, userId });
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
      const adminSession = await this.generateSession(params.ownerId, 2);
      
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
      const adminSession = await this.generateSession('admin', 2);
      
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
      const adminSession = await this.generateSession('admin', 2);
      
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
      const adminSession = await this.generateSession('admin', 2);
      
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
      const userSession = await this.generateSession(userId, 0, 3600, privileges);
      
      // Generate the join URL
      const joinUrl = `${this.apiEndpoint}/virtualEvent/join?ks=${userSession.ks}&id=${meetingId}`;
      
      return joinUrl;
    } catch (error) {
      logger.error('Failed to generate join URL', { error, meetingId, userId });
      throw new Error('Failed to generate join URL');
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
}

// Export a singleton instance
export const kalturaClient = new KalturaClient();