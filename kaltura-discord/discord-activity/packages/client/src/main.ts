import './style.css';
import { initializeDiscordSDK, getCurrentUser, getVoiceChannel, addMessageListener, initializeEventSubscriptions, getActivityParticipants, Participant } from './discordSdk';
import { KalturaPlayerManager } from './kalturaPlayer';
import { SynchronizationService } from './syncService';

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
  
  if (!app) {
    console.error('[DEBUG] Could not find #app element');
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
    const videoId = urlParams.get('videoId');
    const partnerId = urlParams.get('partnerId');
    const uiconfId = urlParams.get('uiconfId');
    
    console.log('[DEBUG] URL parameters:', {
      videoId,
      partnerId,
      uiconfId,
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
    const activityCreatorId = urlParams.get('creatorId');
    isHost = currentUserId === activityCreatorId;
    hostId = activityCreatorId || currentUserId;
    console.log('[DEBUG] Host determination:', { isHost, hostId, activityCreatorId });
    
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
  
  // Create user list
  const userList = document.createElement('div');
  userList.className = 'user-list';
  userList.innerHTML = '<div class="user"><span class="user-name">Loading users...</span></div>';
  
  // Add elements to app
  console.log('[DEBUG] Appending UI elements to DOM');
  app.appendChild(playerContainer);
  app.appendChild(controls);
  app.appendChild(userList);
  
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
    const participants = await getActivityParticipants();
    
    const userListElement = document.querySelector('.user-list');
    if (!userListElement) {
      console.error('[DEBUG] User list element not found');
      return;
    }
    
    // Clear existing content
    userListElement.innerHTML = '';
    
    // Add each participant to the list
    participants.forEach((participant: Participant) => {
      const userElement = document.createElement('div');
      userElement.className = 'user';
      
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
      
      userListElement.appendChild(userElement);
    });
    
    console.log('[DEBUG] Participant list updated with', participants.length, 'users');
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