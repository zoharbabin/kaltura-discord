# Discord Activity Implementation Update Plan

## Overview

This document outlines the detailed plan for updating our Discord Activity implementation to align with the official Discord Activity documentation. The plan is structured into phases with specific tasks, code changes, and testing requirements.

## Phase 1: SDK Update and Initialization

### Tasks

1. **Update SDK Dependencies**
   - Update to the latest version of `@discord/embedded-app-sdk`
   - Review and update any related dependencies

2. **Refactor SDK Initialization**
   - Update the initialization pattern in `discordSdk.ts`
   - Implement proper error handling for SDK initialization
   - Add logging for debugging purposes

### Code Changes

**Update package.json:**
```json
{
  "dependencies": {
    "@discord/embedded-app-sdk": "^1.0.0",
    // other dependencies
  }
}
```

**Update discordSdk.ts:**
```typescript
import { DiscordSDK } from "@discord/embedded-app-sdk";

export const discordSdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);

export async function initializeDiscordSDK(): Promise<void> {
  try {
    console.log('[DEBUG] Waiting for Discord SDK to be ready');
    // Wait for SDK to be ready
    await discordSdk.ready();
    console.log('[DEBUG] Discord SDK is ready');
    
    // Continue with authorization flow
    // ...
  } catch (error) {
    console.error('[DEBUG] Discord SDK initialization failed:', error);
    throw error;
  }
}
```

### Testing

- Verify SDK initializes correctly in development environment
- Check console logs for any initialization errors
- Ensure compatibility with different Discord clients (desktop, web, mobile)

## Phase 2: Authentication Flow Update

### Tasks

1. **Update Authorization Flow**
   - Refactor the authorization code to match the recommended pattern
   - Ensure proper scope requests
   - Implement proper error handling

2. **Update Token Exchange**
   - Update the server-side token exchange endpoint
   - Ensure proper CSP compliance with proxy usage
   - Add validation and error handling

### Code Changes

**Update discordSdk.ts authorization flow:**
```typescript
export async function authorizeWithDiscord(): Promise<string> {
  try {
    console.log('[DEBUG] Authorizing with Discord client');
    const clientId = import.meta.env.VITE_CLIENT_ID;
    
    const { code } = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: [
        'identify',
        'guilds',
        'guilds.members.read',
        'rpc.voice.read',
      ],
    });
    
    return code;
  } catch (error) {
    console.error('[DEBUG] Authorization failed:', error);
    throw error;
  }
}

export async function authenticateWithDiscord(accessToken: string): Promise<any> {
  try {
    console.log('[DEBUG] Authenticating with Discord client');
    const authResult = await discordSdk.commands.authenticate({
      access_token: accessToken,
    });
    
    if (!authResult) {
      throw new Error('Authentication failed - no result returned');
    }
    
    return authResult;
  } catch (error) {
    console.error('[DEBUG] Authentication failed:', error);
    throw error;
  }
}
```

**Update token exchange endpoint in server/src/app.ts:**
```typescript
app.post('/api/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://127.0.0.1',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.status(tokenResponse.status).json({ error: 'Failed to exchange code for token' });
    }
    
    const tokenData = await tokenResponse.json();
    return res.json(tokenData);
  } catch (error) {
    console.error('Error in token exchange:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Testing

- Test the complete authorization flow
- Verify token exchange works correctly
- Check error handling for various failure scenarios
- Test with different user accounts and permissions

## Phase 3: Participant Management

### Tasks

1. **Implement SDK-based Participant Tracking**
   - Replace custom participant tracking with SDK methods
   - Update UI to show participant status
   - Handle participant join/leave events

2. **Update Host Selection Logic**
   - Refine host selection based on participant information
   - Implement host transfer functionality
   - Handle host disconnection scenarios

### Code Changes

**Add participant management to main.ts:**
```typescript
// Track participants
let participants: any[] = [];

// Get initial participants
async function getInitialParticipants() {
  try {
    const response = await discordSdk.commands.getInstanceConnectedParticipants();
    participants = response.participants;
    updateParticipantUI(participants);
    
    // Determine host based on participants
    determineHost(participants);
  } catch (error) {
    console.error('[DEBUG] Failed to get participants:', error);
  }
}

// Subscribe to participant updates
async function subscribeToParticipantUpdates() {
  try {
    await discordSdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", (data) => {
      participants = data.participants;
      updateParticipantUI(participants);
      
      // Check if host is still present
      checkHostPresence(participants);
    });
  } catch (error) {
    console.error('[DEBUG] Failed to subscribe to participant updates:', error);
  }
}

// Update participant UI
function updateParticipantUI(participants: any[]) {
  const userList = document.querySelector('.user-list');
  if (!userList) return;
  
  userList.innerHTML = '';
  
  participants.forEach(participant => {
    const userElement = document.createElement('div');
    userElement.className = 'user';
    
    const isHostClass = participant.id === hostId ? 'host' : '';
    
    userElement.innerHTML = `
      <span class="user-name ${isHostClass}">
        ${participant.global_name || participant.username}
        ${participant.id === hostId ? ' (Host)' : ''}
      </span>
    `;
    
    userList.appendChild(userElement);
  });
}
```

**Update host management in syncService.ts:**
```typescript
// Check if host is still present
function checkHostPresence(participants: any[]) {
  const hostPresent = participants.some(p => p.id === hostId);
  
  if (!hostPresent && participants.length > 0) {
    // Host left, transfer to next participant
    const newHostId = participants[0].id;
    transferHostTo(newHostId);
  }
}

// Transfer host to another participant
function transferHostTo(newHostId: string) {
  if (syncService) {
    syncService.transferHost(newHostId);
  }
}
```

### Testing

- Test participant tracking with multiple users
- Verify host selection works correctly
- Test host transfer functionality
- Test scenarios where the host disconnects

## Phase 4: Event Handling and Layout Optimization

### Tasks

1. **Implement Event Subscriptions**
   - Subscribe to relevant SDK events
   - Handle layout mode changes
   - Handle orientation changes

2. **Optimize UI for Different Layouts**
   - Implement responsive design
   - Optimize for mobile devices
   - Handle picture-in-picture mode

### Code Changes

**Add event subscriptions to main.ts:**
```typescript
// Subscribe to layout mode changes
async function subscribeToLayoutChanges() {
  try {
    await discordSdk.subscribe("ACTIVITY_LAYOUT_MODE_UPDATE", (data) => {
      updateLayoutMode(data.layout_mode);
    });
  } catch (error) {
    console.error('[DEBUG] Failed to subscribe to layout changes:', error);
  }
}

// Subscribe to orientation changes
async function subscribeToOrientationChanges() {
  try {
    await discordSdk.subscribe("ORIENTATION_UPDATE", (data) => {
      updateOrientation(data.screen_orientation);
    });
  } catch (error) {
    console.error('[DEBUG] Failed to subscribe to orientation changes:', error);
  }
}

// Update layout mode
function updateLayoutMode(layoutMode: number) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  
  // Remove existing layout classes
  app.classList.remove('layout-focused', 'layout-pip', 'layout-grid');
  
  // Add new layout class
  switch (layoutMode) {
    case 0: // FOCUSED
      app.classList.add('layout-focused');
      break;
    case 1: // PIP
      app.classList.add('layout-pip');
      break;
    case 2: // GRID
      app.classList.add('layout-grid');
      break;
  }
  
  // Resize player if needed
  if (kalturaPlayer) {
    kalturaPlayer.resize();
  }
}

// Update orientation
function updateOrientation(orientation: number) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  
  // Remove existing orientation classes
  app.classList.remove('orientation-portrait', 'orientation-landscape');
  
  // Add new orientation class
  switch (orientation) {
    case 0: // PORTRAIT
      app.classList.add('orientation-portrait');
      break;
    case 1: // LANDSCAPE
      app.classList.add('orientation-landscape');
      break;
  }
  
  // Resize player if needed
  if (kalturaPlayer) {
    kalturaPlayer.resize();
  }
}
```

**Add mobile optimization to discordSdk.ts:**
```typescript
// Set orientation lock for mobile devices
export async function setOrientationLock() {
  try {
    // Check if we're on a mobile device
    const platformBehaviors = await discordSdk.commands.getPlatformBehaviors();
    const isMobile = platformBehaviors.iosKeyboardResizesView !== undefined;
    
    if (isMobile) {
      await discordSdk.commands.setOrientationLockState({
        lock_state: Common.OrientationLockStateTypeObject.LANDSCAPE,
        picture_in_picture_lock_state: Common.OrientationLockStateTypeObject.LANDSCAPE,
        grid_lock_state: Common.OrientationLockStateTypeObject.UNLOCKED
      });
    }
  } catch (error) {
    console.error('[DEBUG] Failed to set orientation lock:', error);
    // Non-critical error, can continue
  }
}
```

**Update CSS for responsive design:**
```css
/* Base styles */
#app {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* Focused layout (default) */
.layout-focused .player-container {
  height: 70vh;
}

/* PIP layout */
.layout-pip .player-container {
  height: 30vh;
}

.layout-pip .controls {
  display: flex;
  justify-content: center;
}

/* Grid layout */
.layout-grid .player-container {
  height: 50vh;
}

/* Portrait orientation */
.orientation-portrait .player-container {
  width: 100%;
}

/* Landscape orientation */
.orientation-landscape .player-container {
  width: 100%;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .controls button {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .user-list {
    max-height: 100px;
    overflow-y: auto;
  }
}
```

### Testing

- Test layout changes on desktop and mobile
- Verify orientation changes work correctly
- Test picture-in-picture mode
- Ensure UI is responsive and usable on all devices

## Phase 5: Synchronization Enhancement

### Tasks

1. **Investigate SDK Communication Methods**
   - Research if SDK provides methods for participant communication
   - Evaluate alternatives to `window.postMessage`

2. **Enhance Host-based Synchronization**
   - Improve synchronization accuracy
   - Reduce latency in sync operations
   - Handle network issues gracefully

### Code Changes

**Update syncService.ts for improved synchronization:**
```typescript
// Improved synchronization with network conditions consideration
applyPlaybackState(state: PlaybackState, syncTolerance: number = 2): void {
  if (!this.player) return;
  
  // Calculate time adjustment based on message timestamp and estimated network latency
  const timeElapsed = (Date.now() - state.timestamp) / 1000;
  
  // Estimate network latency (simplified version)
  const estimatedLatency = 0.2; // 200ms default latency estimate
  
  // Adjust time with network latency consideration
  const adjustedTime = state.currentTime + timeElapsed + estimatedLatency;
  
  // Check if we need to seek
  const currentTime = this.getCurrentTime();
  const timeDifference = Math.abs(currentTime - adjustedTime);
  
  // Dynamic tolerance based on network conditions
  const dynamicTolerance = Math.max(syncTolerance, estimatedLatency * 2);
  
  if (timeDifference > dynamicTolerance) {
    // Need to sync
    this.seek(adjustedTime);
    
    // Log sync event for analytics
    console.log(`[SYNC] Performed sync with ${timeDifference.toFixed(2)}s difference`);
  }
  
  // Match play/pause state
  const currentlyPlaying = this.isPlaying();
  if (state.isPlaying && !currentlyPlaying) {
    this.play();
  } else if (!state.isPlaying && currentlyPlaying) {
    this.pause();
  }
}
```

**Add adaptive sync interval:**
```typescript
// Adaptive sync interval based on network conditions
private updateSyncInterval(): void {
  if (!this.isHost) return;
  
  // Clear existing interval
  if (this.intervalId !== null) {
    window.clearInterval(this.intervalId);
    this.intervalId = null;
  }
  
  // Set new interval based on network conditions
  // For now, use a simple approach with fixed intervals
  const baseInterval = 5000; // 5 seconds
  
  this.intervalId = window.setInterval(() => {
    this.broadcastState();
  }, baseInterval);
}
```

### Testing

- Test synchronization with different network conditions
- Measure sync accuracy and latency
- Test with multiple participants
- Verify behavior during network interruptions

## Phase 6: Error Handling and Fallbacks

### Tasks

1. **Implement Comprehensive Error Handling**
   - Add error handling for all SDK operations
   - Provide user-friendly error messages
   - Log errors for debugging

2. **Create Fallback Mechanisms**
   - Implement fallbacks for unsupported features
   - Handle graceful degradation
   - Provide alternative experiences when needed

### Code Changes

**Add error handling wrapper:**
```typescript
// Error handling wrapper for SDK commands
export async function executeCommand<T>(
  commandName: string,
  commandFn: () => Promise<T>,
  fallbackValue?: T
): Promise<T> {
  try {
    return await commandFn();
  } catch (error) {
    console.error(`[ERROR] Failed to execute ${commandName}:`, error);
    
    // Show error to user if appropriate
    if (error instanceof Error && error.message.includes('not supported')) {
      showFeatureNotSupportedMessage(commandName);
    }
    
    // Return fallback value or rethrow
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    throw error;
  }
}

// Show feature not supported message
function showFeatureNotSupportedMessage(feature: string) {
  const errorContainer = document.querySelector('.error-container');
  if (!errorContainer) return;
  
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  errorMessage.textContent = `${feature} is not supported in your Discord client. Some features may be limited.`;
  
  errorContainer.appendChild(errorMessage);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorMessage.remove();
  }, 5000);
}
```

**Add fallback mechanisms:**
```typescript
// Fallback for getInstanceConnectedParticipants
async function getParticipants() {
  try {
    // Try SDK method first
    const response = await executeCommand(
      'getInstanceConnectedParticipants',
      () => discordSdk.commands.getInstanceConnectedParticipants()
    );
    return response.participants;
  } catch (error) {
    console.warn('[FALLBACK] Using fallback for participants');
    
    // Fallback: Use current user only
    const currentUser = await getCurrentUser();
    return currentUser ? [currentUser] : [];
  }
}

// Fallback for synchronization
function setupSynchronization() {
  try {
    // Try to set up normal synchronization
    syncService = new SynchronizationService({
      player: kalturaPlayer,
      hostId,
      isHost
    });
    syncService.start();
  } catch (error) {
    console.warn('[FALLBACK] Using fallback synchronization');
    
    // Fallback: Local-only playback
    setupLocalPlayback();
  }
}

function setupLocalPlayback() {
  // Simple local playback without synchronization
  const playPauseButton = document.querySelector('.controls button:first-child');
  if (playPauseButton && kalturaPlayer) {
    playPauseButton.addEventListener('click', () => {
      if (kalturaPlayer.isPlaying()) {
        kalturaPlayer.pause();
      } else {
        kalturaPlayer.play();
      }
      updatePlayPauseButton();
    });
  }
}
```

### Testing

- Test error scenarios for all SDK operations
- Verify fallback mechanisms work correctly
- Test with different Discord client versions
- Ensure graceful degradation for unsupported features

## Phase 7: Analytics and Monitoring

### Tasks

1. **Implement Usage Analytics**
   - Track key user interactions
   - Measure synchronization performance
   - Collect error rates and types

2. **Add Performance Monitoring**
   - Monitor player performance
   - Track synchronization accuracy
   - Measure network conditions

### Code Changes

**Add analytics tracking:**
```typescript
// Simple analytics tracking
const analytics = {
  events: [] as any[],
  
  trackEvent(category: string, action: string, label?: string, value?: number) {
    const event = {
      category,
      action,
      label,
      value,
      timestamp: Date.now()
    };
    
    this.events.push(event);
    
    // In a real implementation, we would send this to a server
    console.log('[ANALYTICS]', event);
    
    // Limit stored events
    if (this.events.length > 100) {
      this.events.shift();
    }
  },
  
  getEvents() {
    return this.events;
  }
};

// Track player events
kalturaPlayer.on('playing', () => {
  analytics.trackEvent('player', 'play');
});

kalturaPlayer.on('pause', () => {
  analytics.trackEvent('player', 'pause');
});

// Track sync events
function trackSyncEvent(timeDifference: number) {
  analytics.trackEvent('sync', 'performed', 'time_difference', timeDifference);
}
```

**Add performance monitoring:**
```typescript
// Simple performance monitoring
const performance = {
  metrics: {} as Record<string, number[]>,
  
  recordMetric(name: string, value: number) {
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    
    this.metrics[name].push(value);
    
    // Limit stored metrics
    if (this.metrics[name].length > 100) {
      this.metrics[name].shift();
    }
  },
  
  getAverageMetric(name: string): number {
    const values = this.metrics[name];
    if (!values || values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
};

// Record sync performance
function recordSyncPerformance(timeDifference: number) {
  performance.recordMetric('sync_difference', timeDifference);
}
```

### Testing

- Verify analytics events are tracked correctly
- Test performance monitoring under different conditions
- Ensure analytics doesn't impact user experience
- Test with different network conditions

## Implementation Timeline

1. **Phase 1: SDK Update and Initialization** - 1 week
2. **Phase 2: Authentication Flow Update** - 1 week
3. **Phase 3: Participant Management** - 2 weeks
4. **Phase 4: Event Handling and Layout Optimization** - 2 weeks
5. **Phase 5: Synchronization Enhancement** - 2 weeks
6. **Phase 6: Error Handling and Fallbacks** - 1 week
7. **Phase 7: Analytics and Monitoring** - 1 week

Total estimated time: 10 weeks

## Conclusion

This implementation plan provides a structured approach to updating our Discord Activity implementation to align with the official documentation. By following this plan, we will ensure our implementation is compatible with the latest Discord client versions, provides a better user experience, and follows best practices for Discord Activities.