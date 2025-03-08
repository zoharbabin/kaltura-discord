export interface KalturaPlayerOptions {
  partnerId: string;
  uiconfId: string;
  targetId: string;
  entryId: string;
  ks?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  timestamp: number;
  hostId: string;
}

export class KalturaPlayerManager {
  private player: any;
  private options: KalturaPlayerOptions;
  private eventHandlers: Map<string, Function[]> = new Map();
  private scriptLoaded: boolean = false;
  
  constructor(options: KalturaPlayerOptions) {
    this.options = options;
  }
  
  /**
   * Initialize the Kaltura Player
   * @returns The Kaltura Player instance
   */
  async initialize(): Promise<any> {
    try {
      console.log('[DEBUG] Starting Kaltura Player initialization');
      
      // Check if target element exists
      const targetElement = document.getElementById(this.options.targetId);
      if (!targetElement) {
        console.error('[DEBUG] Target element not found:', this.options.targetId);
        throw new Error(`Target element not found: ${this.options.targetId}`);
      } else {
        console.log('[DEBUG] Target element found:', {
          id: this.options.targetId,
          dimensions: `${targetElement.clientWidth}x${targetElement.clientHeight}`,
          visibility: window.getComputedStyle(targetElement).display
        });
      }
      
      // Load Kaltura Player script if not already loaded
      if (!this.scriptLoaded) {
        await this.loadPlayerScript();
        this.scriptLoaded = true;
      }
      
      // Wait for KalturaPlayer to be available
      if (typeof window['KalturaPlayer'] === 'undefined') {
        console.error('[DEBUG] KalturaPlayer is not defined after script load');
        throw new Error('KalturaPlayer is not defined');
      } else {
        console.log('[DEBUG] KalturaPlayer is available in window object');
      }
      
      // Initialize player
      console.log('[DEBUG] Setting up Kaltura Player with config:', {
        targetId: this.options.targetId,
        partnerId: this.options.partnerId,
        uiConfId: this.options.uiconfId
      });
      
      this.player = (window as any).KalturaPlayer.setup({
        targetId: this.options.targetId,
        provider: {
          partnerId: this.options.partnerId,
          uiConfId: this.options.uiconfId,
        },
        playback: {
          autoplay: false,
          muted: false,
        }
      });
      
      if (!this.player) {
        console.error('[DEBUG] Player setup returned null or undefined');
        throw new Error('Player setup failed');
      } else {
        console.log('[DEBUG] Player setup successful, player instance created');
      }
      
      // Load media
      console.log('[DEBUG] Loading media with entry ID:', this.options.entryId);
      try {
        await this.player.loadMedia({
          entryId: this.options.entryId,
          ks: this.options.ks
        });
        console.log('[DEBUG] Media loaded successfully');
      } catch (mediaError) {
        console.error('[DEBUG] Failed to load media:', mediaError);
        throw mediaError;
      }
      
      // Set up event listeners
      this.setupEventListeners();
      console.log('[DEBUG] Event listeners set up');
      
      return this.player;
    } catch (error) {
      console.error('[DEBUG] Failed to initialize Kaltura Player:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('[DEBUG] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }
  
  /**
   * Load the Kaltura Player script
   * @returns A promise that resolves when the script is loaded
   */
  private async loadPlayerScript(): Promise<void> {
    console.log('[DEBUG] Starting to load Kaltura Player script', {
      partnerId: this.options.partnerId,
      uiconfId: this.options.uiconfId
    });
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      const scriptUrl = `https://cdnapisec.kaltura.com/p/${this.options.partnerId}/embedPlaykitJs/uiconf_id/${this.options.uiconfId}`;
      console.log('[DEBUG] Loading script from URL:', scriptUrl);
      
      script.src = scriptUrl;
      script.onload = () => {
        console.log('[DEBUG] Kaltura Player script loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('[DEBUG] Failed to load Kaltura Player script:', error);
        reject(new Error(`Failed to load Kaltura Player script: ${error}`));
      };
      document.head.appendChild(script);
    });
  }
  
  /**
   * Set up event listeners for the Kaltura Player
   */
  private setupEventListeners(): void {
    console.log('[DEBUG] Setting up Kaltura Player event listeners');
    
    if (!this.player) {
      console.error('[DEBUG] Cannot set up event listeners - player is not initialized');
      return;
    }
    
    // Check if player has addEventListener method
    if (typeof this.player.addEventListener !== 'function') {
      console.error('[DEBUG] Player does not have addEventListener method:', this.player);
      return;
    }
    
    // Set up basic event listeners
    console.log('[DEBUG] Registering player event listeners');
    
    const events = ['playing', 'pause', 'seeking', 'seeked', 'ended', 'error', 'timeupdate'];
    events.forEach(eventName => {
      try {
        if (eventName === 'timeupdate') {
          this.player.addEventListener(eventName, () => {
            this.emitEvent(eventName, { currentTime: this.player.currentTime });
          });
        } else if (eventName === 'error') {
          this.player.addEventListener(eventName, (error: any) => {
            console.error('[DEBUG] Player error event:', error);
            this.emitEvent(eventName, error);
          });
        } else if (eventName === 'seeking' || eventName === 'seeked') {
          this.player.addEventListener(eventName, (event: any) => {
            this.emitEvent(eventName, event);
          });
        } else {
          this.player.addEventListener(eventName, () => {
            console.log(`[DEBUG] Player event: ${eventName}`);
            this.emitEvent(eventName, {});
          });
        }
        console.log(`[DEBUG] Registered event listener: ${eventName}`);
      } catch (error) {
        console.error(`[DEBUG] Failed to register event listener for ${eventName}:`, error);
      }
    });
    
    // Add a listener for player ready event if available
    try {
      if (typeof this.player.addEventListener === 'function') {
        this.player.addEventListener('playerready', () => {
          console.log('[DEBUG] Player ready event fired');
          
          // Check player dimensions and visibility
          setTimeout(() => {
            const playerElement = document.querySelector('#kaltura-player-container iframe, #kaltura-player-container video');
            console.log('[DEBUG] Player element after ready event:', {
              exists: !!playerElement,
              type: playerElement ? playerElement.tagName : 'N/A',
              dimensions: playerElement ? `${playerElement.clientWidth}x${playerElement.clientHeight}` : 'N/A',
              visibility: playerElement ? window.getComputedStyle(playerElement).display : 'N/A'
            });
          }, 500);
        });
      }
    } catch (error) {
      console.error('[DEBUG] Failed to register playerready event:', error);
    }
  }
  
  /**
   * Add an event listener
   * @param event The event name
   * @param callback The callback function
   */
  on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);
  }
  
  /**
   * Remove an event listener
   * @param event The event name
   * @param callback The callback function
   */
  off(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(callback);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Emit an event to all registered listeners
   * @param event The event name
   * @param data The event data
   */
  private emitEvent(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    
    if (event !== 'timeupdate') { // Don't log timeupdate events to avoid console spam
      console.log(`[DEBUG] Emitting event: ${event}`, {
        handlersCount: handlers.length,
        data: event === 'error' ? data : undefined // Only log data for error events
      });
    }
    
    if (handlers.length === 0) {
      if (event !== 'timeupdate') { // Don't log warnings for timeupdate events
        console.warn(`[DEBUG] No handlers registered for event: ${event}`);
      }
    } else {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[DEBUG] Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Play the video
   */
  play(): void {
    console.log('[DEBUG] Play requested');
    if (this.player) {
      try {
        this.player.play();
        console.log('[DEBUG] Play command executed');
      } catch (error) {
        console.error('[DEBUG] Error during play:', error);
      }
    } else {
      console.error('[DEBUG] Cannot play - player is not initialized');
    }
  }
  
  /**
   * Pause the video
   */
  pause(): void {
    console.log('[DEBUG] Pause requested');
    if (this.player) {
      try {
        this.player.pause();
        console.log('[DEBUG] Pause command executed');
      } catch (error) {
        console.error('[DEBUG] Error during pause:', error);
      }
    } else {
      console.error('[DEBUG] Cannot pause - player is not initialized');
    }
  }
  
  /**
   * Seek to a specific time
   * @param time The time to seek to in seconds
   */
  seek(time: number): void {
    console.log('[DEBUG] Seek requested to time:', time);
    if (this.player) {
      try {
        this.player.currentTime = time;
        console.log('[DEBUG] Seek command executed');
      } catch (error) {
        console.error('[DEBUG] Error during seek:', error);
      }
    } else {
      console.error('[DEBUG] Cannot seek - player is not initialized');
    }
  }
  
  /**
   * Get the current playback time
   * @returns The current playback time in seconds
   */
  getCurrentTime(): number {
    return this.player ? this.player.currentTime : 0;
  }
  
  /**
   * Get the video duration
   * @returns The video duration in seconds
   */
  getDuration(): number {
    return this.player ? this.player.duration : 0;
  }
  
  /**
   * Check if the video is playing
   * @returns True if the video is playing, false otherwise
   */
  isPlaying(): boolean {
    return this.player ? !this.player.paused : false;
  }
  
  /**
   * Get the current playback state
   * @param hostId The host ID
   * @returns The current playback state
   */
  getPlaybackState(hostId: string): PlaybackState {
    return {
      isPlaying: this.isPlaying(),
      currentTime: this.getCurrentTime(),
      timestamp: Date.now(),
      hostId
    };
  }
  
  /**
   * Apply a playback state
   * @param state The playback state to apply
   * @param syncTolerance The tolerance for synchronization in seconds
   */
  applyPlaybackState(state: PlaybackState, syncTolerance: number = 2): void {
    console.log('[DEBUG] Applying playback state:', state);
    
    if (!this.player) {
      console.error('[DEBUG] Cannot apply playback state - player is not initialized');
      return;
    }
    
    // Calculate time adjustment based on message timestamp
    const timeElapsed = (Date.now() - state.timestamp) / 1000;
    const adjustedTime = state.currentTime + timeElapsed;
    
    // Check if we need to seek
    const currentTime = this.getCurrentTime();
    const timeDifference = Math.abs(currentTime - adjustedTime);
    
    console.log('[DEBUG] Sync calculation:', {
      currentTime,
      receivedTime: state.currentTime,
      timeElapsed,
      adjustedTime,
      timeDifference,
      syncTolerance,
      needsSync: timeDifference > syncTolerance
    });
    
    if (timeDifference > syncTolerance) {
      console.log(`[DEBUG] Seeking to sync time: ${adjustedTime.toFixed(2)}s (${timeDifference.toFixed(2)}s difference)`);
      this.seek(adjustedTime);
    } else {
      console.log(`[DEBUG] Time difference (${timeDifference.toFixed(2)}s) within tolerance, no seek needed`);
    }
    
    // Match play/pause state
    const currentlyPlaying = this.isPlaying();
    if (state.isPlaying && !currentlyPlaying) {
      console.log('[DEBUG] State is playing but player is paused, playing now');
      this.play();
    } else if (!state.isPlaying && currentlyPlaying) {
      console.log('[DEBUG] State is paused but player is playing, pausing now');
      this.pause();
    } else {
      console.log('[DEBUG] Play/pause state already matches, no change needed');
    }
  }
  
  /**
   * Destroy the player
   */
  destroy(): void {
    if (this.player) {
      this.player.destroy();
      this.player = undefined;
    }
    
    // Clear all event handlers
    this.eventHandlers.clear();
  }
}