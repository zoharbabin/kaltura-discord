import './style.css';
import { initializeDiscordSDK, getCurrentUser, getVoiceChannel, addMessageListener, initializeEventSubscriptions, getActivityParticipants, getUserPresences, getCurrentUserId, updateUserNetworkQuality } from './discordSdk';
import { patchUrlMappings } from '@discord/embedded-app-sdk';
import { KalturaPlayerManager } from './kalturaPlayer';
import { SynchronizationService } from './syncService';
import { NetworkIndicator } from './components/NetworkIndicator';
import { UserPresenceDisplay } from './components/UserPresenceDisplay';
import { UserPresence } from './types/userPresence';

// Declare global variables for UI components
declare global {
  interface Window {
    networkIndicator: NetworkIndicator;
    userPresenceDisplay: UserPresenceDisplay;
  }
}

// Application state
let kalturaPlayer: KalturaPlayerManager | null = null;
let syncService: SynchronizationService | null = null;
let isHost = false;
let hostId = '';
let currentUserId = '';

// DOM elements
const app = document.querySelector<HTMLDivElement>('#app');
const loadingElement = document.createElement('div');
loadingElement.className = 'loading';
loadingElement.textContent = 'Initializing Kaltura Watch Together...';
// Initialize the application
async function init() {
  console.log('[DEBUG] Starting application initialization');
  
  // Patch URL mappings for Kaltura domains
  console.log('[DEBUG] Patching URL mappings for Kaltura domains');
  patchUrlMappings([
    { prefix: '/kaltura', target: 'cdnapisec.kaltura.com' },
    { prefix: '/kaltura-cdn', target: 'cfvod.kaltura.com' },
    { prefix: '/kaltura-api', target: 'api.kaltura.com' },
    { prefix: '/kaltura-hls', target: 'cfvod.kaltura.com/scf/hls' }
  ]);
  console.log('[DEBUG] URL mappings patched');
  
  // Create a debug panel to show errors in the activity, but hide it by default
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.position = 'fixed';
  debugPanel.style.bottom = '0';
  debugPanel.style.left = '0';
  debugPanel.style.right = '0';
  debugPanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
  debugPanel.style.color = 'white';
  debugPanel.style.padding = '10px';
  debugPanel.style.fontFamily = 'monospace';
  debugPanel.style.fontSize = '12px';
  debugPanel.style.maxHeight = '200px';
  debugPanel.style.overflowY = 'auto';
  debugPanel.style.zIndex = '9999';
  debugPanel.style.display = 'block'; // Visible by default

  // Make admin features available to all users for debugging
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = true; // Always enable admin features
  
  // Create controls container for all users
  const controlsContainer = document.createElement('div');
  controlsContainer.style.position = 'fixed';
  controlsContainer.style.top = '10px';
  controlsContainer.style.left = '10px';
  controlsContainer.style.zIndex = '9999';
  controlsContainer.style.display = 'flex';
  controlsContainer.style.gap = '10px';
  
  // Add a button to show/hide the viewers panel
  const showViewersButton = document.createElement('button');
  showViewersButton.textContent = 'Show Viewers';
  showViewersButton.style.padding = '5px 10px';
  showViewersButton.style.backgroundColor = '#444';
  showViewersButton.style.color = 'white';
  showViewersButton.style.border = 'none';
  showViewersButton.style.borderRadius = '3px';
  showViewersButton.style.cursor = 'pointer';
  
  // Add show/hide functionality for viewers panel
  showViewersButton.addEventListener('click', () => {
    const viewersPanel = document.querySelector('.user-presence-container') as HTMLElement;
    if (viewersPanel) {
      if (viewersPanel.style.display === 'none') {
        viewersPanel.style.display = 'block';
        showViewersButton.textContent = 'Hide Viewers';
      } else {
        viewersPanel.style.display = 'none';
        showViewersButton.textContent = 'Show Viewers';
      }
    }
  });
  
  controlsContainer.appendChild(showViewersButton);
  
  // Add admin controls
  if (isAdmin) {
    // Add a button to show/hide the debug panel
    const showLogButton = document.createElement('button');
    showLogButton.textContent = 'Hide Log'; // Changed to 'Hide Log' since the log is visible by default
    showLogButton.style.padding = '5px 10px';
    showLogButton.style.backgroundColor = '#444';
    showLogButton.style.color = 'white';
    showLogButton.style.border = 'none';
    showLogButton.style.borderRadius = '3px';
    showLogButton.style.cursor = 'pointer';
    
    // Add show/hide functionality for debug panel
    let isLogVisible = true; // Set to true since debug panel is visible by default
    showLogButton.addEventListener('click', () => {
      if (isLogVisible) {
        debugPanel.style.display = 'none';
        showLogButton.textContent = 'Show Log';
      } else {
        debugPanel.style.display = 'block';
        showLogButton.textContent = 'Hide Log';
      }
      isLogVisible = !isLogVisible;
    });
    
    controlsContainer.appendChild(showLogButton);
  }
  
  document.body.appendChild(controlsContainer);
  document.body.appendChild(debugPanel);
  
  // Add a toggle button to minimize/maximize the debug panel
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Minimize Log';
  toggleButton.style.position = 'absolute';
  toggleButton.style.top = '5px';
  toggleButton.style.right = '5px';
  toggleButton.style.padding = '3px 8px';
  toggleButton.style.backgroundColor = '#444';
  toggleButton.style.color = 'white';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '3px';
  toggleButton.style.cursor = 'pointer';
  
  // Add toggle functionality
  let isMinimized = false;
  toggleButton.addEventListener('click', () => {
    if (isMinimized) {
      // Maximize
      debugPanel.style.maxHeight = '200px';
      debugPanel.style.padding = '10px';
      toggleButton.textContent = 'Minimize Log';
    } else {
      // Minimize
      debugPanel.style.maxHeight = '30px';
      debugPanel.style.padding = '5px 10px';
      toggleButton.textContent = 'Expand Log';
    }
    isMinimized = !isMinimized;
  });
  
  debugPanel.appendChild(toggleButton);
  
  // Override console methods to also display in debug panel
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    appendToDebugPanel('LOG', ...args);
  };
  
  console.error = function(...args) {
    originalConsoleError.apply(console, args);
    appendToDebugPanel('ERROR', ...args);
  };
  
  console.warn = function(...args) {
    originalConsoleWarn.apply(console, args);
    appendToDebugPanel('WARN', ...args);
  };
  
  // Function to append messages to debug panel
  function appendToDebugPanel(level: string, ...args: any[]) {
    try {
      const line = document.createElement('div');
      line.style.marginBottom = '5px';
      line.style.borderLeft = level === 'ERROR' ? '3px solid red' :
                             level === 'WARN' ? '3px solid yellow' : '3px solid green';
      line.style.paddingLeft = '5px';
      
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      line.textContent = `[${timestamp}] [${level}] ${message}`;
      debugPanel.appendChild(line);
      debugPanel.scrollTop = debugPanel.scrollHeight;
    } catch (e) {
      // Don't let debug panel errors cause more issues
    }
  }
  
  // Add global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error || event.message);
  });
  
  // Add unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
  
  if (!app) {
    console.error('[DEBUG] Could not find #app element');
    showError('Could not find app element. Please try reloading.');
    return;
  } else {
    console.log('[DEBUG] Found #app element:', {
      dimensions: `${app.clientWidth}x${app.clientHeight}`,
      visibility: window.getComputedStyle(app).display
    });
  }

  // Show loading screen
  app.appendChild(loadingElement);
  console.log('[DEBUG] Added loading screen to DOM');
  
  // Add a test button to check if the proxy is working (available to all users)
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Kaltura Proxy';
  testButton.style.position = 'fixed';
  testButton.style.top = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '9999';
  testButton.style.padding = '5px 10px';
  testButton.style.backgroundColor = '#ff5500'; // Bright orange for visibility
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.borderRadius = '3px';
  testButton.style.cursor = 'pointer';
  testButton.style.fontWeight = 'bold';
    testButton.addEventListener('click', async () => {
      console.log('[DEBUG] Testing Kaltura proxy...');
      try {
        // Get the actual partnerId and uiconfId from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const partnerId = urlParams.get('partnerId') || '5896392';
        const uiconfId = urlParams.get('uiconfId') || '56085172';
        
        // Try to fetch a resource through the proxy using actual IDs
        const testUrl = `/.proxy/kaltura/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}`;
        console.log('[DEBUG] Fetching test URL:', testUrl);
        
        const response = await fetch(testUrl);
        // Get headers as an object
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        
        console.log('[DEBUG] Proxy test response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers
        });
        
        if (!response.ok) {
          console.error('[DEBUG] Proxy test failed with status:', response.status);
        } else {
          const text = await response.text();
          console.log('[DEBUG] Proxy test succeeded, content length:', text.length);
        }
      } catch (error) {
        console.error('[DEBUG] Proxy test error:', error);
      }
    });
    document.body.appendChild(testButton);

  try {
    // Initialize Discord SDK
    console.log('[DEBUG] Initializing Discord SDK');
    try {
      await initializeDiscordSDK();
      console.log('[DEBUG] Discord SDK initialized successfully');
      
      // Initialize event subscriptions
      console.log('[DEBUG] Setting up Discord SDK event subscriptions');
      await initializeEventSubscriptions();
      console.log('[DEBUG] Discord SDK event subscriptions initialized');
    } catch (discordError) {
      console.error('[DEBUG] Discord SDK initialization failed:', discordError);
      throw discordError;
    }
    
    // Get current user
    console.log('[DEBUG] Getting current user');
    const user = await getCurrentUser();
    currentUserId = user?.id || '';
    console.log('[DEBUG] Current user:', { id: currentUserId, user });
    
    // Get voice channel information
    console.log('[DEBUG] Getting voice channel information');
    const voiceChannel = await getVoiceChannel();
    console.log('[DEBUG] Voice channel:', voiceChannel);
    
    // Parse URL parameters for video information
    console.log('[DEBUG] Parsing URL parameters');
    const urlParams = new URLSearchParams(window.location.search);
    
    // First try to get parameters from metadata
    let videoId: string | null = null;
    let partnerId: string | null = null;
    let uiconfId: string | null = null;
    let creatorId: string | null = null;
    
    // Try to parse metadata parameter which contains JSON with video info
    const metadataStr = urlParams.get('metadata');
    if (metadataStr) {
      try {
        const metadata = JSON.parse(decodeURIComponent(metadataStr));
        console.log('[DEBUG] Parsed metadata:', metadata);
        
        // Extract video parameters from metadata
        videoId = metadata.videoId || null;
        partnerId = metadata.partnerId || null;
        uiconfId = metadata.uiconfId || null;
        creatorId = metadata.creatorId || null;
      } catch (e) {
        console.error('[DEBUG] Failed to parse metadata:', e);
      }
    }
    
    // If not found in metadata, try direct URL parameters as fallback
    if (!videoId) videoId = urlParams.get('videoId');
    if (!partnerId) partnerId = urlParams.get('partnerId');
    if (!uiconfId) uiconfId = urlParams.get('uiconfId');
    if (!creatorId) creatorId = urlParams.get('creatorId');
    
    // Check for custom_id parameter which might contain our video ID
    const customId = urlParams.get('custom_id');
    if (!videoId && customId) {
      // Extract video ID from custom_id (format: discord_activity_VIDEO_ID)
      const customIdMatch = customId.match(/discord_activity_(.+)/);
      if (customIdMatch) {
        videoId = customIdMatch[1];
        console.log('[DEBUG] Extracted video ID from custom_id:', videoId);
      }
    }
    
    // Use default values if parameters are still missing
    if (!videoId) videoId = '1_obcsps1q'; // Default video ID from the URL you provided
    if (!partnerId) partnerId = '5896392'; // Default partner ID from the URL you provided
    if (!uiconfId) uiconfId = '56085172'; // Default uiconf ID from the URL you provided
    
    console.log('[DEBUG] URL parameters:', {
      videoId,
      partnerId,
      uiconfId,
      creatorId,
      allParams: Object.fromEntries(urlParams.entries())
    });
    
    if (!videoId || !partnerId || !uiconfId) {
      console.error('[DEBUG] Missing required video parameters');
      showError('Missing required video parameters. Please restart the activity.');
      return;
    }
    
    // Determine if we're the host
    // For now, the user who launched the activity is the host
    // In a real implementation, this would be stored in Discord's activity state
    isHost = currentUserId === creatorId;
    hostId = creatorId || currentUserId;
    console.log('[DEBUG] Host determination:', { isHost, hostId, creatorId });
    
    // Create the UI
    console.log('[DEBUG] Creating UI');
    createUI(videoId, partnerId, uiconfId);
    
    // Set up message listeners
    console.log('[DEBUG] Setting up message listeners');
    setupMessageListeners();
    
    // Hide loading screen
    console.log('[DEBUG] Removing loading screen');
    loadingElement.remove();
    
    console.log('[DEBUG] Kaltura Watch Together initialized', {
      user,
      voiceChannel,
      videoId,
      isHost
    });
  } catch (error) {
    console.error('[DEBUG] Failed to initialize application:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    showError(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Create the user interface
function createUI(videoId: string, partnerId: string, uiconfId: string) {
  console.log('[DEBUG] Creating UI elements');
  if (!app) {
    console.error('[DEBUG] App element not available for UI creation');
    return;
  }
  
  // Create player container
  console.log('[DEBUG] Creating player container');
  const playerContainer = document.createElement('div');
  playerContainer.className = 'player-container';
  playerContainer.id = 'kaltura-player-container';
  playerContainer.style.position = 'relative'; // Required for absolute positioning of overlays
  
  // Create controls
  console.log('[DEBUG] Creating controls');
  const controls = document.createElement('div');
  controls.className = 'controls';
  
  // Create play/pause button
  const playPauseButton = document.createElement('button');
  playPauseButton.textContent = 'Play';
  playPauseButton.addEventListener('click', togglePlayPause);
  
  // Create sync button (for non-hosts)
  const syncButton = document.createElement('button');
  syncButton.textContent = 'Sync with Host';
  syncButton.addEventListener('click', requestSync);
  if (isHost) {
    syncButton.disabled = true;
    syncButton.title = 'You are the host';
  }
  
  // Add buttons to controls
  controls.appendChild(playPauseButton);
  controls.appendChild(syncButton);
  
  // Add elements to app
  console.log('[DEBUG] Appending UI elements to DOM');
  app.appendChild(playerContainer);
  app.appendChild(controls);
  
  // Create network indicator
  console.log('[DEBUG] Creating network indicator');
  const networkIndicator = new NetworkIndicator(playerContainer);
  
  // Create user presence display
  console.log('[DEBUG] Creating user presence display');
  const userPresenceDisplay = new UserPresenceDisplay(playerContainer);
  
  // Store references for later use
  window.networkIndicator = networkIndicator;
  window.userPresenceDisplay = userPresenceDisplay;
  
  // Check if player container is properly added to DOM
  const containerInDOM = document.getElementById('kaltura-player-container');
  console.log('[DEBUG] Player container in DOM:', {
    exists: !!containerInDOM,
    dimensions: containerInDOM ? `${containerInDOM.clientWidth}x${containerInDOM.clientHeight}` : 'N/A',
    visibility: containerInDOM ? window.getComputedStyle(containerInDOM).display : 'N/A',
    zIndex: containerInDOM ? window.getComputedStyle(containerInDOM).zIndex : 'N/A'
  });
  
  // Initialize Kaltura player
  console.log('[DEBUG] Starting player initialization');
  initializePlayer(videoId, partnerId, uiconfId);
}

// Initialize the Kaltura player
async function initializePlayer(videoId: string, partnerId: string, uiconfId: string) {
  console.log('[DEBUG] Initializing Kaltura player with:', { videoId, partnerId, uiconfId });
  try {
    // Verify player container exists before creating player
    const playerContainer = document.getElementById('kaltura-player-container');
    if (!playerContainer) {
      console.error('[DEBUG] Player container not found in DOM');
      throw new Error('Player container not found in DOM');
    } else {
      console.log('[DEBUG] Player container found with dimensions:',
        `${playerContainer.clientWidth}x${playerContainer.clientHeight}`);
    }
    
    // Create Kaltura player manager
    console.log('[DEBUG] Creating KalturaPlayerManager instance');
    kalturaPlayer = new KalturaPlayerManager({
      partnerId,
      uiconfId,
      targetId: 'kaltura-player-container',
      entryId: videoId
    });
    
    // Initialize the player
    console.log('[DEBUG] Calling kalturaPlayer.initialize()');
    await kalturaPlayer.initialize();
    console.log('[DEBUG] Player initialization completed');
    
    // Check if player is properly rendered
    const playerElement = document.querySelector('#kaltura-player-container iframe, #kaltura-player-container video');
    console.log('[DEBUG] Player element in DOM:', {
      exists: !!playerElement,
      type: playerElement ? playerElement.tagName : 'N/A',
      dimensions: playerElement ? `${playerElement.clientWidth}x${playerElement.clientHeight}` : 'N/A',
      visibility: playerElement ? window.getComputedStyle(playerElement).display : 'N/A'
    });
    
    // Set up synchronization service
    console.log('[DEBUG] Setting up synchronization service');
    syncService = new SynchronizationService({
      player: kalturaPlayer,
      hostId,
      isHost
    });
    
    // Start synchronization
    console.log('[DEBUG] Starting synchronization service');
    syncService.start();
    
    // Update play/pause button based on initial state
    updatePlayPauseButton();
    
    // Set up player event listeners
    console.log('[DEBUG] Setting up player event listeners');
    kalturaPlayer.on('playing', (event: any) => {
      console.log('[DEBUG] Player event: playing', event);
      updatePlayPauseButton();
    });
    kalturaPlayer.on('pause', (event: any) => {
      console.log('[DEBUG] Player event: pause', event);
      updatePlayPauseButton();
    });
    kalturaPlayer.on('error', (error: any) => {
      console.error('[DEBUG] Player event: error', error);
    });
    
    console.log('[DEBUG] Kaltura player initialization complete');
  } catch (error) {
    console.error('[DEBUG] Failed to initialize Kaltura player:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    showError(`Failed to load video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Toggle play/pause
function togglePlayPause() {
  if (!kalturaPlayer) return;
  
  if (kalturaPlayer.isPlaying()) {
    kalturaPlayer.pause();
  } else {
    kalturaPlayer.play();
  }
}

// Update play/pause button text based on player state
function updatePlayPauseButton() {
  if (!kalturaPlayer) return;
  
  const playPauseButton = document.querySelector('.controls button:first-child') as HTMLButtonElement;
  if (playPauseButton) {
    playPauseButton.textContent = kalturaPlayer.isPlaying() ? 'Pause' : 'Play';
  }
}

// Request synchronization with host
function requestSync() {
  if (!syncService) return;
  
  // Show feedback to the user - find the sync button by its text content
  const buttons = document.querySelectorAll('.controls button');
  const syncButton = Array.from(buttons).find(button =>
    button.textContent?.includes('Sync with Host')
  ) as HTMLButtonElement | undefined;
  
  if (syncButton) {
    const originalText = syncButton.textContent;
    syncButton.textContent = 'Syncing...';
    syncButton.disabled = true;
    
    // Re-enable the button after a short delay
    setTimeout(() => {
      syncButton.textContent = originalText;
      syncButton.disabled = false;
    }, 2000);
  }
  
  // Request sync from the host
  syncService.requestSync();
}

// Set up message listeners
function setupMessageListeners() {
  // Listen for host transfer messages
  addMessageListener('HOST_TRANSFER', (data: { previousHostId: string, newHostId: string }) => {
    if (data.newHostId === currentUserId) {
      // We are the new host
      isHost = true;
      hostId = currentUserId;
      
      // Accept the host transfer
      if (syncService) {
        syncService.acceptHostTransfer(data.previousHostId);
      }
      
      // Update UI - find the sync button by its text content
      const buttons = document.querySelectorAll('.controls button');
      const syncButton = Array.from(buttons).find(button =>
        button.textContent?.includes('Sync with Host')
      ) as HTMLButtonElement | undefined;
      
      if (syncButton) {
        syncButton.disabled = true;
        syncButton.title = 'You are the host';
      }
    }
  });
  
  // Listen for participant updates
  addMessageListener('PARTICIPANT_UPDATE', () => {
    updateParticipantList();
  });
  
  // Set up a timer to periodically update the participant list
  setInterval(updateParticipantList, 10000); // Update every 10 seconds
  
  // Initial participant list update
  updateParticipantList();
}

// Update the participant list UI
async function updateParticipantList() {
  try {
    console.log('[DEBUG] Updating participant list');
    
    // Get participants with enhanced presence information
    const participants = await getActivityParticipants();
    
    // Update the user presence display if available
    if (window.userPresenceDisplay) {
      window.userPresenceDisplay.updateUsers(participants);
      console.log('[DEBUG] User presence display updated with', participants.length, 'users');
    } else {
      console.warn('[DEBUG] User presence display not available');
    }
    
    // Update network quality indicator if available
    if (window.networkIndicator && syncService) {
      const userId = getCurrentUserId() || 'current-user';
      const networkQuality = syncService.getNetworkQuality(userId);
      window.networkIndicator.setQuality(networkQuality);
      console.log('[DEBUG] Network indicator updated:', networkQuality);
    }
  } catch (error) {
    console.error('[DEBUG] Error updating participant list:', error);
  }
}

// Show error message
function showError(message: string) {
  console.error('[DEBUG] Showing error message to user:', message);
  
  if (!app) {
    console.error('[DEBUG] Cannot show error - app element not found');
    return;
  }
  
  // Remove loading screen if it exists
  try {
    if (document.body.contains(loadingElement)) {
      loadingElement.remove();
      console.log('[DEBUG] Removed loading element');
    }
  } catch (error) {
    console.error('[DEBUG] Error removing loading element:', error);
  }
  
  // Create error element
  console.log('[DEBUG] Creating error UI');
  const errorElement = document.createElement('div');
  errorElement.className = 'error';
  
  // Create error message
  const errorMessage = document.createElement('div');
  errorMessage.textContent = message;
  
  // Create retry button
  const retryButton = document.createElement('button');
  retryButton.textContent = 'Retry';
  retryButton.addEventListener('click', () => {
    console.log('[DEBUG] Retry button clicked, reloading page');
    window.location.reload();
  });
  
  // Add elements to error container
  errorElement.appendChild(errorMessage);
  errorElement.appendChild(retryButton);
  
  // Add error container to app
  app.appendChild(errorElement);
  console.log('[DEBUG] Error UI displayed to user');
  
  // Log additional debugging information about the DOM state
  console.log('[DEBUG] Current DOM state:', {
    appElement: {
      width: app.clientWidth,
      height: app.clientHeight,
      children: app.childElementCount,
      visibility: window.getComputedStyle(app).display
    },
    errorElement: {
      width: errorElement.clientWidth,
      height: errorElement.clientHeight,
      visibility: window.getComputedStyle(errorElement).display
    },
    bodyContent: document.body.innerHTML.length
  });
}

// Clean up resources when the window is closed
window.addEventListener('beforeunload', () => {
  if (syncService) {
    syncService.stop();
  }
  
  if (kalturaPlayer) {
    kalturaPlayer.destroy();
  }
});

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);