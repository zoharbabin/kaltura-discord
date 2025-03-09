/**
 * User presence and synchronization types
 */

/**
 * Network quality levels
 */
export type NetworkQuality = 'good' | 'fair' | 'poor';

/**
 * User status types
 */
export type UserStatus = 'active' | 'inactive' | 'away';

/**
 * Playback state interface
 */
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  buffering?: boolean;
  seeking?: boolean;
  timestamp?: number;
  hostId?: string;
}

/**
 * User presence interface
 */
export interface UserPresence {
  id: string;
  username: string;
  isHost: boolean;
  status: UserStatus;
  lastActive: number;
  playbackState?: PlaybackState;
  networkQuality?: NetworkQuality;
}

/**
 * Synchronization metrics interface
 */
export interface SyncMetrics {
  syncAttempts: number;
  syncSuccesses: number;
  averageSyncDelta: number;
  lastSyncTime: number;
  networkQuality: NetworkQuality;
}

/**
 * User synchronization metrics interface
 */
export interface UserSyncMetrics {
  userId: string;
  averageSyncDelta: number;
  networkQuality: NetworkQuality;
}

/**
 * Synchronization options interface
 */
export interface SyncOptions {
  player: any;
  hostId: string;
  isHost: boolean;
  syncInterval?: number;
  syncTolerance?: number;
}

/**
 * Synchronization request interface
 */
export interface SyncRequest {
  requesterId: string;
  timestamp?: number;
}

/**
 * Synchronization response interface
 */
export interface SyncResponse {
  success: boolean;
  hostId: string;
  playbackState: PlaybackState;
  timestamp: number;
}

/**
 * Host transfer interface
 */
export interface HostTransfer {
  previousHostId: string;
  newHostId: string;
}

/**
 * Network quality update interface
 */
export interface NetworkQualityUpdate {
  userId: string;
  quality: NetworkQuality;
  timestamp?: number;
}