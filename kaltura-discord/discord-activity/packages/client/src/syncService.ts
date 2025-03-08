import { discordSdk, sendMessage, addMessageListener } from './discordSdk';
import { KalturaPlayerManager, PlaybackState } from './kalturaPlayer';

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
    
    // If we're the host, start broadcasting playback state
    if (this.isHost) {
      console.log('[DEBUG] We are the host, starting sync broadcast');
      this.startSyncBroadcast();
    } else {
      console.log('[DEBUG] We are not the host, waiting for sync messages');
    }
    
    // Set up player event listeners
    this.setupPlayerEventListeners();
    console.log('[DEBUG] Player event listeners set up');
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
   * Set up player event listeners
   */
  private setupPlayerEventListeners(): void {
    // Only the host should broadcast events
    if (!this.isHost) return;
    
    // Listen for play event
    this.player.on('playing', () => {
      this.broadcastState();
    });
    
    // Listen for pause event
    this.player.on('pause', () => {
      this.broadcastState();
    });
    
    // Listen for seek event
    this.player.on('seeked', () => {
      this.broadcastState();
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
    
    // Apply the playback state
    this.player.applyPlaybackState(state, this.syncTolerance);
  }
  
  /**
   * Force synchronization with the host
   * This can be called by non-host participants to request the current state
   */
  /**
   * Force synchronization with the host
   * This can be called by non-host participants to request the current state
   */
  requestSync(): void {
    if (this.isHost) return; // Host doesn't need to request sync
    
    // Send a sync request message with the current user's ID
    // Note: We're not using this.hostId because that's the ID of the host,
    // not the current user who is requesting synchronization
    sendMessage('SYNC_REQUEST', { requesterId: 'current-user' });
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
  }
  
  /**
   * Accept host status transfer
   * @param previousHostId The ID of the previous host
   */
  acceptHostTransfer(previousHostId: string): void {
    // Update local state
    this.isHost = true;
    // Get current user ID from the host ID since we're now the host
    this.hostId = this.hostId;
    
    // Start broadcasting
    this.startSyncBroadcast();
    
    // Send confirmation message
    sendMessage('HOST_TRANSFER_ACCEPTED', {
      previousHostId,
      newHostId: this.hostId
    });
  }
}