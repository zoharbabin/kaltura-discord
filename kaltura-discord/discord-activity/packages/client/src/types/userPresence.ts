/**
 * User presence status
 */
export type UserStatus = 'active' | 'inactive' | 'away';

/**
 * Network quality level
 */
export type NetworkQuality = 'good' | 'fair' | 'poor';

/**
 * Playback state information
 */
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  buffering: boolean;
  seeking?: boolean;
  timestamp: number;
  hostId: string;
}

/**
 * User presence information
 */
export interface UserPresence {
  /**
   * User ID (Discord user ID)
   */
  id: string;
  
  /**
   * Username (Discord username)
   */
  username: string;
  
  /**
   * Whether this user is the host
   */
  isHost: boolean;
  
  /**
   * User's current status
   */
  status: UserStatus;
  
  /**
   * Timestamp of last user activity
   */
  lastActive: number;
  
  /**
   * Current playback state (if available)
   */
  playbackState?: {
    isPlaying: boolean;
    currentTime: number;
    buffering: boolean;
    seeking?: boolean;
  };
  
  /**
   * Network quality indicator
   */
  networkQuality?: NetworkQuality;
}

/**
 * Synchronization metrics for a user
 */
export interface SyncMetrics {
  /**
   * Number of sync attempts
   */
  syncAttempts: number;
  
  /**
   * Number of successful syncs
   */
  syncSuccesses: number;
  
  /**
   * Average time difference in seconds
   */
  averageSyncDelta: number;
  
  /**
   * Timestamp of last sync attempt
   */
  lastSyncTime: number;
  
  /**
   * Network quality based on sync performance
   */
  networkQuality: NetworkQuality;
}

/**
 * Presence event types
 */
export type PresenceEventType = 
  | 'USER_JOIN'
  | 'USER_LEAVE'
  | 'PLAYBACK_CHANGE'
  | 'NETWORK_CHANGE'
  | 'STATUS_CHANGE'
  | 'HOST_CHANGE';

/**
 * Presence event payload
 */
export interface PresenceEvent {
  type: PresenceEventType;
  userId: string;
  timestamp: number;
  data?: any;
}