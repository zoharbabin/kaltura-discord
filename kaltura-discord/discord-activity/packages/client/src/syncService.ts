import { discordSdk, sendMessage, addMessageListener, updateUserNetworkQuality, updateUserPlaybackState, getCurrentUserId } from './discordSdk';
import { KalturaPlayerManager, PlaybackState } from './kalturaPlayer';
import { NetworkQuality, SyncMetrics } from './types/userPresence';

export interface SyncOptions {
  player: KalturaPlayerManager;
  hostId: string;
  isHost: boolean;
  syncInterval?: number; // milliseconds
  syncTolerance?: number; // seconds
}

export class SynchronizationService {
  private player: KalturaPlayerManager;
  private hostId: string;
  private isHost: boolean;
  private syncInterval: number;
  private syncTolerance: number;
  private intervalId: number | null = null;
  private removeMessageListener: (() => void) | null = null;
  private syncMetrics: Map<string, SyncMetrics> = new Map();
  private lastNetworkUpdate: number = 0;
  private networkUpdateInterval: number = 10000; // Update network quality every 10 seconds
  
  constructor(options: SyncOptions) {
    this.player = options.player;
    this.hostId = options.hostId;
    this.isHost = options.isHost;
    this.syncInterval = options.syncInterval || 5000; // Default: sync every 5 seconds
    this.syncTolerance = options.syncTolerance || 2; // Default: 2 seconds tolerance
  }
  
  /**
   * Start the synchronization service
   */
  start(): void {
    console.log('[DEBUG] Starting synchronization service', {
      isHost: this.isHost,
      hostId: this.hostId,
      syncInterval: this.syncInterval,
      syncTolerance: this.syncTolerance
    });
    
    // Set up message listener for sync events
    this.removeMessageListener = addMessageListener('PLAYBACK_SYNC', this.handleSyncMessage.bind(this));
    console.log('[DEBUG] Registered PLAYBACK_SYNC message listener');
    
    // Set up message listener for sync requests
    addMessageListener('SYNC_REQUEST', this.handleSyncRequest.bind(this));
    console.log('[DEBUG] Registered SYNC_REQUEST message listener');
    
    // Set up message listener for network quality updates
    addMessageListener('NETWORK_QUALITY_UPDATE', this.handleNetworkQualityUpdate.bind(this));
    console.log('[DEBUG] Registered NETWORK_QUALITY_UPDATE message listener');
    
    // If we're the host, start broadcasting playback state
    if (this.isHost) {
      console.log('[DEBUG] We are the host, starting sync broadcast');
      this.startSyncBroadcast();
    } else {
      console.log('[DEBUG] We are not the host, waiting for sync messages');
      // Request initial sync from host
      this.requestSync();
    }
    
    // Set up player event listeners
    this.setupPlayerEventListeners();
    console.log('[DEBUG] Player event listeners set up');
    
    // Initialize sync metrics for current user
    const userId = getCurrentUserId() || 'current-user';
    this.syncMetrics.set(userId, {
      syncAttempts: 0,
      syncSuccesses: 0,
      averageSyncDelta: 0,
      lastSyncTime: Date.now(),
      networkQuality: 'good'
    });
    
    // Start periodic network quality updates
    this.startNetworkQualityUpdates();
  }
  
  /**
   * Stop the synchronization service
   */
  stop(): void {
    // Clear the sync interval
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Remove the message listener
    if (this.removeMessageListener) {
      this.removeMessageListener();
      this.removeMessageListener = null;
    }
  }
  
  /**
   * Handle sync request from a participant
   * @param data The sync request data
   */
  private handleSyncRequest(data: { requesterId: string }): void {
    console.log('[DEBUG] Received sync request from:', data.requesterId);
    
    // Only the host should respond to sync requests
    if (!this.isHost) {
      console.log('[DEBUG] Ignoring sync request - we are not the host');
      return;
    }
    
    // Broadcast current playback state
    this.broadcastState();
    console.log('[DEBUG] Sent playback state in response to sync request');
  }
  
  /**
   * Handle network quality update from a participant
   * @param data The network quality update data
   */
  private handleNetworkQualityUpdate(data: { userId: string, quality: NetworkQuality }): void {
    console.log('[DEBUG] Received network quality update:', data);
    
    // Update sync metrics with network quality
    const metrics = this.syncMetrics.get(data.userId);
    if (metrics) {
      metrics.networkQuality = data.quality;
      this.syncMetrics.set(data.userId, metrics);
    }
  }
  
  /**
   * Start periodic network quality updates
   */
  private startNetworkQualityUpdates(): void {
    // Update network quality every 10 seconds
    setInterval(() => {
      const userId = getCurrentUserId() || 'current-user';
      const metrics = this.syncMetrics.get(userId);
      
      if (metrics && Date.now() - this.lastNetworkUpdate > this.networkUpdateInterval) {
        // Update network quality based on sync metrics
        updateUserNetworkQuality(userId, metrics.networkQuality);
        
        // Broadcast network quality update
        sendMessage('NETWORK_QUALITY_UPDATE', {
          userId,
          quality: metrics.networkQuality
        });
        
        this.lastNetworkUpdate = Date.now();
      }
    }, this.networkUpdateInterval);
  }
  
  /**
   * Set up player event listeners
   */
  private setupPlayerEventListeners(): void {
    // Only the host should broadcast events
    if (!this.isHost) {
      // Non-host players should update their playback state for presence
      this.player.on('playing', () => {
        const userId = getCurrentUserId() || 'current-user';
        updateUserPlaybackState(userId, {
          isPlaying: true,
          currentTime: this.player.getCurrentTime(),
          buffering: false
        });
      });
      
      this.player.on('pause', () => {
        const userId = getCurrentUserId() || 'current-user';
        updateUserPlaybackState(userId, {
          isPlaying: false,
          currentTime: this.player.getCurrentTime(),
          buffering: false
        });
      });
      
      this.player.on('seeking', () => {
        const userId = getCurrentUserId() || 'current-user';
        updateUserPlaybackState(userId, {
          isPlaying: this.player.isPlaying(),
          currentTime: this.player.getCurrentTime(),
          buffering: false,
          seeking: true
        });
      });
      
      this.player.on('seeked', () => {
        const userId = getCurrentUserId() || 'current-user';
        updateUserPlaybackState(userId, {
          isPlaying: this.player.isPlaying(),
          currentTime: this.player.getCurrentTime(),
          buffering: false,
          seeking: false
        });
      });
      
      this.player.on('waiting', () => {
        const userId = getCurrentUserId() || 'current-user';
        updateUserPlaybackState(userId, {
          isPlaying: this.player.isPlaying(),
          currentTime: this.player.getCurrentTime(),
          buffering: true
        });
      });
      
      return;
    }
    
    // Host event listeners
    // Listen for play event
    this.player.on('playing', () => {
      this.broadcastState();
      
      // Update host playback state
      const userId = getCurrentUserId() || 'current-user';
      updateUserPlaybackState(userId, {
        isPlaying: true,
        currentTime: this.player.getCurrentTime(),
        buffering: false
      });
    });
    
    // Listen for pause event
    this.player.on('pause', () => {
      this.broadcastState();
      
      // Update host playback state
      const userId = getCurrentUserId() || 'current-user';
      updateUserPlaybackState(userId, {
        isPlaying: false,
        currentTime: this.player.getCurrentTime(),
        buffering: false
      });
    });
    
    // Listen for seek event
    this.player.on('seeking', () => {
      const userId = getCurrentUserId() || 'current-user';
      updateUserPlaybackState(userId, {
        isPlaying: this.player.isPlaying(),
        currentTime: this.player.getCurrentTime(),
        buffering: false,
        seeking: true
      });
    });
    
    this.player.on('seeked', () => {
      this.broadcastState();
      
      // Update host playback state
      const userId = getCurrentUserId() || 'current-user';
      updateUserPlaybackState(userId, {
        isPlaying: this.player.isPlaying(),
        currentTime: this.player.getCurrentTime(),
        buffering: false,
        seeking: false
      });
    });
    
    this.player.on('waiting', () => {
      const userId = getCurrentUserId() || 'current-user';
      updateUserPlaybackState(userId, {
        isPlaying: this.player.isPlaying(),
        currentTime: this.player.getCurrentTime(),
        buffering: true
      });
    });
  }
  
  /**
   * Start broadcasting playback state at regular intervals
   */
  private startSyncBroadcast(): void {
    // Broadcast initial state
    this.broadcastState();
    
    // Set up interval for regular sync
    this.intervalId = window.setInterval(() => {
      this.broadcastState();
    }, this.syncInterval);
  }
  
  /**
   * Broadcast the current playback state to all participants
   */
  private broadcastState(): void {
    if (!this.isHost) {
      console.warn('[DEBUG] Non-host tried to broadcast state');
      return;
    }
    
    const state = this.player.getPlaybackState(this.hostId);
    
    console.log('[DEBUG] Broadcasting playback state:', {
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      timestamp: state.timestamp
    });
    
    // Send state to all participants via Discord SDK
    try {
      sendMessage('PLAYBACK_SYNC', state);
      console.log('[DEBUG] Playback state broadcast sent');
    } catch (error) {
      console.error('[DEBUG] Error broadcasting playback state:', error);
    }
  }
  
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
    updateUserNetworkQuality(userId, currentMetrics.networkQuality);
  }
  
  /**
   * Handle incoming sync messages
   * @param state The playback state from the host
   */
  private handleSyncMessage(state: PlaybackState): void {
    console.log('[DEBUG] Received sync message:', {
      state,
      currentHostId: this.hostId,
      isHost: this.isHost
    });
    
    // Ignore our own messages if we're the host
    if (state.hostId === this.hostId && this.isHost) {
      console.log('[DEBUG] Ignoring our own sync message (we are the host)');
      return;
    }
    
    // Only apply state from the host
    if (state.hostId !== this.hostId) {
      console.warn('[DEBUG] Ignoring sync message from non-host user:', state.hostId);
      return;
    }
    
    console.log('[DEBUG] Applying playback state from host');
    
    // Get current user ID
    const userId = getCurrentUserId() || 'current-user';
    
    // Calculate time adjustment based on message timestamp
    const timeElapsed = (Date.now() - state.timestamp) / 1000;
    const adjustedTime = state.currentTime + timeElapsed;
    
    // Check if we need to seek
    const currentTime = this.player.getCurrentTime();
    const timeDifference = Math.abs(currentTime - adjustedTime);
    
    // Update sync metrics
    this.updateSyncMetrics(userId, timeDifference, timeDifference <= this.syncTolerance);
    
    // Get network quality for adaptive sync
    const metrics = this.syncMetrics.get(userId);
    const networkQuality = metrics?.networkQuality || 'good';
    
    // Adjust sync tolerance based on network quality
    let adaptiveTolerance = this.syncTolerance;
    if (networkQuality === 'fair') {
      adaptiveTolerance = this.syncTolerance * 1.5;
    } else if (networkQuality === 'poor') {
      adaptiveTolerance = this.syncTolerance * 2;
    }
    
    console.log(`[DEBUG] Adaptive sync: ${networkQuality} quality, tolerance ${adaptiveTolerance.toFixed(2)}s`);
    
    // Apply the playback state with adaptive tolerance
    this.player.applyPlaybackState(state, adaptiveTolerance);
  }
  
  /**
   * Force synchronization with the host
   * This can be called by non-host participants to request the current state
   */
  requestSync(): void {
    if (this.isHost) return; // Host doesn't need to request sync
    
    // Get current user ID
    const userId = getCurrentUserId() || 'current-user';
    
    // Send a sync request message with the current user's ID
    sendMessage('SYNC_REQUEST', { requesterId: userId });
    
    console.log('[DEBUG] Sent sync request to host');
  }
  
  /**
   * Transfer host status to another user
   * @param newHostId The ID of the new host
   */
  transferHost(newHostId: string): void {
    if (!this.isHost) return; // Only the current host can transfer host status
    
    // Send host transfer message
    sendMessage('HOST_TRANSFER', { 
      previousHostId: this.hostId,
      newHostId 
    });
    
    // Update local state
    this.isHost = false;
    this.hostId = newHostId;
    
    // Stop broadcasting
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log(`[DEBUG] Host status transferred to ${newHostId}`);
  }
  
  /**
   * Accept host status transfer
   * @param previousHostId The ID of the previous host
   */
  acceptHostTransfer(previousHostId: string): void {
    // Update local state
    this.isHost = true;
    
    // Get current user ID
    const userId = getCurrentUserId() || 'current-user';
    this.hostId = userId;
    
    // Start broadcasting
    this.startSyncBroadcast();
    
    // Send confirmation message
    sendMessage('HOST_TRANSFER_ACCEPTED', {
      previousHostId,
      newHostId: this.hostId
    });
    
    console.log(`[DEBUG] Accepted host transfer from ${previousHostId}`);
  }
  
  /**
   * Get sync metrics for all users
   * @returns Map of user IDs to sync metrics
   */
  getSyncMetrics(): Map<string, SyncMetrics> {
    return new Map(this.syncMetrics);
  }
  
  /**
   * Get network quality for a user
   * @param userId The user ID
   * @returns The network quality or 'good' if not available
   */
  getNetworkQuality(userId: string): NetworkQuality {
    return this.syncMetrics.get(userId)?.networkQuality || 'good';
  }
  
  /**
   * Calculate adaptive sync tolerance based on network quality
   * @param networkQuality The network quality
   * @returns The sync tolerance in seconds
   */
  calculateSyncTolerance(networkQuality: NetworkQuality): number {
    switch (networkQuality) {
      case 'good':
        return 0.5; // 0.5 seconds tolerance
      case 'fair':
        return 1.5; // 1.5 seconds tolerance
      case 'poor':
        return 3.0; // 3 seconds tolerance
      default:
        return this.syncTolerance; // Default tolerance
    }
  }
}