# Discord Activity API Integration Plan

## Overview

This document outlines the architectural plan for replacing mock endpoints in the Discord Activity server with real API calls and enhancing user presence features. The implementation will leverage the newly available video API endpoints to provide a more robust and feature-rich experience for users watching Kaltura videos together in Discord voice channels.

## Current State Analysis

The Discord Activity implementation currently uses mock data in several key areas:

1. **Video Details Retrieval**: When real Kaltura API credentials are not available, the server returns mock video data instead of fetching real video information.
2. **Kaltura Session Generation**: Mock KS tokens are generated for development/testing when real credentials are not available.
3. **Video Search and Listing**: Mock video lists are returned when searching or listing videos.
4. **User Presence**: Basic user presence information is displayed, but lacks detailed status and synchronization information.

## Implementation Goals

1. Replace all mock endpoints with real API calls to the Kaltura-Discord integration's API Gateway
2. Enhance user presence features with more detailed information
3. Improve synchronization between participants
4. Ensure proper error handling and fallback mechanisms

## Architectural Changes

### 1. API Client Integration

Create a dedicated API client in the Discord Activity server to communicate with the Kaltura-Discord API Gateway:

```typescript
// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiClientOptions {
  baseUrl: string;
  timeout?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(options: ApiClientOptions) {
    this.client = axios.create({
      baseURL: options.baseUrl,
      timeout: options.timeout || 10000,
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string): void {
    this.token = token;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient({
  baseUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000/api',
});
```

### 2. Video Service Integration

Update the KalturaService to use the API Gateway endpoints instead of direct Kaltura API calls:

```typescript
// src/services/kalturaService.ts
import { ApiClient, apiClient } from './apiClient';
import { KalturaVideoDetails, KalturaSessionOptions } from '../types';

export class KalturaService {
  private apiClient: ApiClient;
  private apiEndpoint: string;

  constructor(apiEndpoint: string = 'https://www.kaltura.com/api_v3', client: ApiClient = apiClient) {
    this.apiEndpoint = apiEndpoint;
    this.apiClient = client;
  }

  async authenticate(discordId: string, username: string, roles: string[]): Promise<string> {
    try {
      const response = await this.apiClient.post<{ token: string }>('/auth/token', {
        discordId,
        username,
        roles
      });
      
      this.apiClient.setToken(response.token);
      return response.token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate with API Gateway');
    }
  }

  async generateSession(options: KalturaSessionOptions): Promise<string> {
    try {
      // First ensure we have a valid token
      if (!this.apiClient.hasToken()) {
        throw new Error('Not authenticated with API Gateway');
      }

      // Use the API Gateway to generate a session
      const response = await this.apiClient.post<{ ks: string }>(`/videos/${options.entryId || 'default'}/session`, {
        userId: options.userId || 'anonymous',
        type: options.type || 0,
        privileges: options.privileges || ''
      });
      
      return response.ks;
    } catch (error) {
      console.error('Error generating Kaltura session:', error);
      
      // Fallback to mock KS for development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock KS for development');
        return `mock_ks_${options.entryId || 'default'}_${options.userId || 'anonymous'}_${Date.now()}`;
      }
      
      throw error;
    }
  }

  async getVideoDetails(entryId: string, ks?: string): Promise<KalturaVideoDetails> {
    try {
      // Use the API Gateway to get video details
      const response = await this.apiClient.get<{ video: KalturaVideoDetails }>(`/videos/${entryId}`);
      return response.video;
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
      
      throw error;
    }
  }

  async listVideos(pageSize: number = 30, page: number = 1): Promise<KalturaVideoDetails[]> {
    try {
      // Use the API Gateway to list videos
      const response = await this.apiClient.get<{ videos: KalturaVideoDetails[] }>('/videos', {
        params: { pageSize, page }
      });
      
      return response.videos;
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
      
      throw error;
    }
  }

  async searchVideos(query: string, pageSize: number = 30, page: number = 1): Promise<KalturaVideoDetails[]> {
    try {
      // Use the API Gateway to search videos
      const response = await this.apiClient.get<{ videos: KalturaVideoDetails[] }>('/videos/search', {
        params: { q: query, pageSize, page }
      });
      
      return response.videos;
    } catch (error) {
      console.error('Error searching videos:', error);
      
      // Fallback to mock videos for development only
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock videos for development');
        return Array.from({ length: 5 }, (_, i) => ({
          id: `mock_video_${i + 1}`,
          title: `Sample Video ${i + 1} - "${query}"`,
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
      
      throw error;
    }
  }

  async generatePlayUrl(entryId: string): Promise<string> {
    try {
      // Use the API Gateway to generate a play URL
      const response = await this.apiClient.post<{ playUrl: string }>(`/videos/${entryId}/play`);
      return response.playUrl;
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
```

### 3. Enhanced User Presence Features

Extend the user presence functionality in the client-side code:

```typescript
// src/types.ts
export interface UserPresence {
  id: string;
  username: string;
  isHost: boolean;
  status: 'active' | 'inactive' | 'away';
  lastActive: number; // timestamp
  playbackState?: {
    isPlaying: boolean;
    currentTime: number;
    buffering: boolean;
  };
  networkQuality?: 'good' | 'fair' | 'poor';
}
```

Update the Discord SDK wrapper to include enhanced presence information:

```typescript
// src/discordSdk.ts (additions)

// Track user presence
const userPresences = new Map<string, UserPresence>();

// Update user presence
export function updateUserPresence(userId: string, presence: Partial<UserPresence>): void {
  const currentPresence = userPresences.get(userId) || {
    id: userId,
    username: 'Unknown User',
    isHost: userId === hostId,
    status: 'active',
    lastActive: Date.now()
  };
  
  userPresences.set(userId, {
    ...currentPresence,
    ...presence,
    lastActive: presence.status ? Date.now() : currentPresence.lastActive
  });
  
  // Broadcast presence update
  sendMessage('USER_PRESENCE_UPDATE', {
    userId,
    presence: userPresences.get(userId)
  });
}

// Get all user presences
export function getUserPresences(): UserPresence[] {
  return Array.from(userPresences.values());
}

// Enhanced getActivityParticipants function
export async function getActivityParticipants(): Promise<UserPresence[]> {
  try {
    console.log('[DEBUG] Getting activity participants with enhanced presence');
    
    // Use Discord SDK to get participants
    let participants: UserPresence[] = [];
    
    if (discordSdk.channelId) {
      try {
        const channel = await discordSdk.commands.getChannel({
          channel_id: discordSdk.channelId
        });
        
        if (channel && channel.voice_states) {
          participants = channel.voice_states.map((voiceState: any) => {
            const userId = voiceState.user.id;
            const existingPresence = userPresences.get(userId);
            
            // Create or update presence
            const presence: UserPresence = {
              id: userId,
              username: voiceState.user.username || 'Unknown User',
              isHost: userId === hostId,
              status: 'active',
              lastActive: existingPresence?.lastActive || Date.now(),
              playbackState: existingPresence?.playbackState,
              networkQuality: existingPresence?.networkQuality || 'good'
            };
            
            // Store updated presence
            userPresences.set(userId, presence);
            
            return presence;
          });
        }
      } catch (channelError) {
        console.error('[DEBUG] Error getting channel members:', channelError);
      }
    }
    
    // If we couldn't get participants from the channel, use stored presences
    if (participants.length === 0 && userPresences.size > 0) {
      participants = Array.from(userPresences.values());
    }
    
    // If we still have no participants, use a fallback
    if (participants.length === 0) {
      const defaultPresence: UserPresence = {
        id: 'current-user',
        username: 'Current User',
        isHost: true,
        status: 'active',
        lastActive: Date.now()
      };
      
      userPresences.set('current-user', defaultPresence);
      participants = [defaultPresence];
    }
    
    console.log('[DEBUG] Retrieved activity participants with presence:', participants);
    return participants;
  } catch (error) {
    console.error('[DEBUG] Error getting activity participants:', error);
    return [];
  }
}

// Set up periodic presence updates
export function startPresenceUpdates(): void {
  // Update presence every 30 seconds
  setInterval(() => {
    // Check for inactive users (no activity for 2 minutes)
    const now = Date.now();
    userPresences.forEach((presence, userId) => {
      if (now - presence.lastActive > 120000 && presence.status === 'active') {
        updateUserPresence(userId, { status: 'away' });
      }
    });
    
    // Update network quality based on recent sync performance
    // This would be implemented based on sync metrics
  }, 30000);
}
```

### 4. Enhanced Synchronization Service

Update the synchronization service to include network quality monitoring and adaptive sync:

```typescript
// src/syncService.ts (additions)

export interface SyncMetrics {
  syncAttempts: number;
  syncSuccesses: number;
  averageSyncDelta: number;
  lastSyncTime: number;
  networkQuality: 'good' | 'fair' | 'poor';
}

export class SynchronizationService {
  // ... existing code ...
  
  private syncMetrics: Map<string, SyncMetrics> = new Map();
  
  // ... existing code ...
  
  /**
   * Update sync metrics for a user
   * @param userId The user ID
   * @param syncDelta The time difference in seconds
   * @param success Whether the sync was successful
   */
  private updateSyncMetrics(userId: string, syncDelta: number, success: boolean): void {
    const currentMetrics = this.syncMetrics.get(userId) || {
      syncAttempts: 0,
      syncSuccesses: 0,
      averageSyncDelta: 0,
      lastSyncTime: Date.now(),
      networkQuality: 'good'
    };
    
    // Update metrics
    currentMetrics.syncAttempts++;
    if (success) {
      currentMetrics.syncSuccesses++;
    }
    
    // Update average sync delta using weighted average
    const weight = 0.3; // Weight for new value
    currentMetrics.averageSyncDelta = 
      (1 - weight) * currentMetrics.averageSyncDelta + weight * Math.abs(syncDelta);
    
    currentMetrics.lastSyncTime = Date.now();
    
    // Determine network quality
    if (currentMetrics.averageSyncDelta < 0.5) {
      currentMetrics.networkQuality = 'good';
    } else if (currentMetrics.averageSyncDelta < 2) {
      currentMetrics.networkQuality = 'fair';
    } else {
      currentMetrics.networkQuality = 'poor';
    }
    
    // Store updated metrics
    this.syncMetrics.set(userId, currentMetrics);
    
    // Update user presence with network quality
    updateUserPresence(userId, { networkQuality: currentMetrics.networkQuality });
  }
  
  /**
   * Apply playback state with adaptive sync based on network quality
   * @param state The playback state to apply
   * @param syncTolerance The tolerance for synchronization in seconds
   */
  applyPlaybackState(state: PlaybackState, syncTolerance: number = 2): void {
    // ... existing code ...
    
    // Calculate time adjustment based on message timestamp
    const timeElapsed = (Date.now() - state.timestamp) / 1000;
    const adjustedTime = state.currentTime + timeElapsed;
    
    // Check if we need to seek
    const currentTime = this.player.getCurrentTime();
    const timeDifference = Math.abs(currentTime - adjustedTime);
    
    // Update sync metrics
    this.updateSyncMetrics(state.hostId, timeDifference, timeDifference <= syncTolerance);
    
    // Get network quality for adaptive sync
    const metrics = this.syncMetrics.get(state.hostId);
    const networkQuality = metrics?.networkQuality || 'good';
    
    // Adjust sync tolerance based on network quality
    let adaptiveTolerance = syncTolerance;
    if (networkQuality === 'fair') {
      adaptiveTolerance = syncTolerance * 1.5;
    } else if (networkQuality === 'poor') {
      adaptiveTolerance = syncTolerance * 2;
    }
    
    console.log(`[DEBUG] Adaptive sync: ${networkQuality} quality, tolerance ${adaptiveTolerance.toFixed(2)}s`);
    
    if (timeDifference > adaptiveTolerance) {
      console.log(`[DEBUG] Seeking to sync time: ${adjustedTime.toFixed(2)}s (${timeDifference.toFixed(2)}s difference)`);
      this.player.seek(adjustedTime);
    } else {
      console.log(`[DEBUG] Time difference (${timeDifference.toFixed(2)}s) within tolerance, no seek needed`);
    }
    
    // ... existing code ...
  }
  
  /**
   * Get sync metrics for all users
   * @returns Map of user IDs to sync metrics
   */
  getSyncMetrics(): Map<string, SyncMetrics> {
    return new Map(this.syncMetrics);
  }
}
```

### 5. Updated User Interface

Enhance the UI to display more detailed user presence information:

```typescript
// src/main.ts (additions)

// Update the participant list UI with enhanced presence information
async function updateParticipantList() {
  try {
    console.log('[DEBUG] Updating participant list with enhanced presence');
    const participants = await getActivityParticipants();
    
    const userListElement = document.querySelector('.user-list');
    if (!userListElement) {
      console.error('[DEBUG] User list element not found');
      return;
    }
    
    // Clear existing content
    userListElement.innerHTML = '';
    
    // Add each participant to the list
    participants.forEach((participant: UserPresence) => {
      const userElement = document.createElement('div');
      userElement.className = `user user-status-${participant.status}`;
      
      // Add network quality indicator
      if (participant.networkQuality) {
        userElement.classList.add(`network-${participant.networkQuality}`);
      }
      
      const nameElement = document.createElement('span');
      nameElement.className = 'user-name';
      nameElement.textContent = participant.username || 'Unknown User';
      
      userElement.appendChild(nameElement);
      
      // Add host badge if this participant is the host
      if (participant.id === hostId || participant.isHost) {
        const hostBadge = document.createElement('span');
        hostBadge.className = 'host-badge';
        hostBadge.textContent = 'HOST';
        userElement.appendChild(hostBadge);
      }
      
      // Add status indicator
      const statusIndicator = document.createElement('span');
      statusIndicator.className = 'status-indicator';
      statusIndicator.title = `Status: ${participant.status}`;
      userElement.appendChild(statusIndicator);
      
      // Add network quality indicator
      if (participant.networkQuality) {
        const networkIndicator = document.createElement('span');
        networkIndicator.className = `network-indicator network-${participant.networkQuality}`;
        networkIndicator.title = `Network: ${participant.networkQuality}`;
        userElement.appendChild(networkIndicator);
      }
      
      // Add playback state if available
      if (participant.playbackState) {
        const playbackIndicator = document.createElement('span');
        playbackIndicator.className = 'playback-indicator';
        playbackIndicator.textContent = participant.playbackState.isPlaying ? '▶️' : '⏸️';
        playbackIndicator.title = `${participant.playbackState.isPlaying ? 'Playing' : 'Paused'} at ${formatTime(participant.playbackState.currentTime)}`;
        userElement.appendChild(playbackIndicator);
      }
      
      userListElement.appendChild(userElement);
    });
    
    console.log('[DEBUG] Participant list updated with', participants.length, 'users');
  } catch (error) {
    console.error('[DEBUG] Error updating participant list:', error);
  }
}

// Format time in MM:SS format
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

### 6. Server-Side App.ts Updates

Update the server-side app.ts to use the new API client:

```typescript
// src/app.ts (modifications)

import { ApiClient, apiClient } from './services/apiClient';
import { KalturaService } from './services/kalturaService';

// Initialize API client with API Gateway URL
const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000/api';
console.log(`Using API Gateway at: ${apiGatewayUrl}`);

// Initialize Kaltura service with API client
const kalturaService = new KalturaService(process.env.VITE_KALTURA_API_ENDPOINT, apiClient);

// Token handler - authenticate with API Gateway
const tokenHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Exchange Discord code for token with API Gateway
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
    
    const userData = await userResponse.json();
    
    // Authenticate with API Gateway
    try {
      const apiToken = await kalturaService.authenticate(
        userData.id,
        userData.username,
        userData.roles || []
      );
      
      // Return both tokens to the client
      res.send({
        access_token,
        token_type,
        expires_in,
        scope,
        api_token: apiToken
      });
    } catch (apiError) {
      console.error('API Gateway authentication failed:', apiError);
      
      // Still return Discord token even if API Gateway auth fails
      res.send({
        access_token,
        token_type,
        expires_in,
        scope
      });
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update other handlers to use the kalturaService methods that now use the API Gateway
```

## CSS Updates for Enhanced User Presence

Add CSS styles for the enhanced user presence UI:

```css
/* style.css additions */

/* User status styles */
.user {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  background-color: rgba(35, 39, 42, 0.5);
}

.user-status-active .status-indicator {
  background-color: #43b581;
}

.user-status-inactive .status-indicator {
  background-color: #faa61a;
}

.user-status-away .status-indicator {
  background-color: #f04747;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-left: 8px;
}

/* Network quality indicators */
.network-indicator {
  width: 12px;
  height: 12px;
  margin-left: 8px;
  background-size: contain;
  background-repeat: no-repeat;
}

.network-good {
  background-color: #43b581;
}

.network-fair {
  background-color: #faa61a;
}

.network-poor {
  background-color: #f04747;
}

/* Playback indicator */
.playback-indicator {
  margin-left: 8px;
  font-size: 12px;
}

/* Host badge */
.host-badge {
  background-color: #5865f2;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  margin-left: 8px;
}
```

## Implementation Sequence

1. **Phase 1: API Client Integration**
   - Create the ApiClient class
   - Update KalturaService to use the API client
   - Implement authentication with the API Gateway

2. **Phase 2: Replace Mock Endpoints**
   - Update video details retrieval
   - Update session generation
   - Update video search and listing

3. **Phase 3: Enhanced User Presence**
   - Implement UserPresence interface
   - Update Discord SDK wrapper
   - Add presence tracking and updates

4. **Phase 4: Enhanced Synchronization**
   - Implement sync metrics tracking
   - Add adaptive sync based on network quality
   - Update UI to display sync status

5. **Phase 5: Testing and Deployment**
   - Test with real API endpoints
   - Verify user presence features
   - Deploy to production

## Error Handling and Fallbacks

- Maintain development fallbacks for local testing without API access
- Implement graceful degradation for network issues
- Add retry mechanisms for API calls
- Provide clear error messages to users

## Conclusion

This implementation plan provides a comprehensive approach to replacing mock endpoints with real API calls and enhancing user presence features in the Discord Activity. By leveraging the existing API Gateway endpoints and improving the synchronization and presence mechanisms, we can create a more robust and feature-rich experience for users watching Kaltura videos together in Discord voice channels.