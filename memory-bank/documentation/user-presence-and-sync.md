# User Presence and Synchronization Documentation

This document provides an overview of the user presence framework and enhanced synchronization features implemented in the Kaltura Discord Activity.

## Table of Contents
1. [User Presence Framework](#user-presence-framework)
2. [Network Quality Monitoring](#network-quality-monitoring)
3. [Adaptive Synchronization](#adaptive-synchronization)
4. [UI Components](#ui-components)
5. [Integration Guide](#integration-guide)

## User Presence Framework

The User Presence Framework tracks and displays the status of users in the Discord Activity. It provides real-time updates on user activity, playback state, and network conditions.

### UserPresence Interface

```typescript
export interface UserPresence {
  id: string;              // User ID (Discord user ID)
  username: string;        // Discord username
  isHost: boolean;         // Whether this user is the host
  status: UserStatus;      // 'active', 'inactive', or 'away'
  lastActive: number;      // Timestamp of last user activity
  playbackState?: {        // Current playback state (if available)
    isPlaying: boolean;
    currentTime: number;
    buffering: boolean;
    seeking?: boolean;
  };
  networkQuality?: NetworkQuality; // 'good', 'fair', or 'poor'
}
```

### Status Types

- **Active**: User has interacted with the application recently
- **Inactive**: User has been idle for 2 minutes
- **Away**: User has been idle for 5 minutes

### Presence Events

The framework broadcasts events when user presence changes:

- `USER_JOIN`: When a new user joins the activity
- `USER_LEAVE`: When a user leaves the activity
- `PLAYBACK_CHANGE`: When a user's playback state changes
- `NETWORK_CHANGE`: When a user's network quality changes
- `STATUS_CHANGE`: When a user's status changes
- `HOST_CHANGE`: When the host role is transferred

## Network Quality Monitoring

The system monitors network quality to optimize synchronization and provide visual feedback to users.

### SyncMetrics Interface

```typescript
export interface SyncMetrics {
  syncAttempts: number;      // Number of sync attempts
  syncSuccesses: number;     // Number of successful syncs
  averageSyncDelta: number;  // Average time difference in seconds
  lastSyncTime: number;      // Timestamp of last sync attempt
  networkQuality: NetworkQuality; // Network quality based on sync performance
}
```

### Network Quality Levels

- **Good**: Average sync delta < 0.5 seconds
- **Fair**: Average sync delta between 0.5 and 2 seconds
- **Poor**: Average sync delta > 2 seconds

## Adaptive Synchronization

The synchronization system adapts to network conditions to provide a smoother experience.

### Key Features

1. **Metrics-Based Tolerance**: Adjusts synchronization tolerance based on network quality
2. **Weighted Average**: Uses weighted average for sync delta to prioritize recent performance
3. **Automatic Retry**: Automatically retries failed synchronization attempts
4. **Host Prioritization**: Ensures host commands take precedence

### Tolerance Levels

- **Good Network**: 0.5 seconds tolerance
- **Fair Network**: 1.5 seconds tolerance
- **Poor Network**: 3.0 seconds tolerance

## UI Components

### NetworkIndicator

The NetworkIndicator component displays the current network quality as a colored dot with text:

- **Green**: Good connection
- **Yellow**: Fair connection
- **Red**: Poor connection

```typescript
// Example usage
const networkIndicator = new NetworkIndicator(containerElement);
networkIndicator.setQuality('good'); // Update quality
```

### UserPresenceDisplay

The UserPresenceDisplay component shows a list of users with their status and network quality:

```typescript
// Example usage
const userPresenceDisplay = new UserPresenceDisplay(containerElement);
userPresenceDisplay.updateUsers(participants); // Update with new user data
```

## Integration Guide

### Adding User Presence to an Existing Project

1. **Import the necessary types and components**:
   ```typescript
   import { UserPresence, NetworkQuality } from './types/userPresence';
   import { NetworkIndicator } from './components/NetworkIndicator';
   import { UserPresenceDisplay } from './components/UserPresenceDisplay';
   ```

2. **Create the UI components**:
   ```typescript
   const playerContainer = document.getElementById('player-container');
   const networkIndicator = new NetworkIndicator(playerContainer);
   const userPresenceDisplay = new UserPresenceDisplay(playerContainer);
   ```

3. **Update the components with user data**:
   ```typescript
   // Get participants with presence information
   const participants = await getActivityParticipants();
   userPresenceDisplay.updateUsers(participants);
   
   // Update network quality
   const userId = getCurrentUserId();
   const networkQuality = syncService.getNetworkQuality(userId);
   networkIndicator.setQuality(networkQuality);
   ```

4. **Set up periodic updates**:
   ```typescript
   setInterval(() => {
     const participants = getUserPresences();
     userPresenceDisplay.updateUsers(participants);
     
     const userId = getCurrentUserId();
     const networkQuality = syncService.getNetworkQuality(userId);
     networkIndicator.setQuality(networkQuality);
   }, 2000);
   ```

### Implementing Adaptive Synchronization

1. **Initialize the SynchronizationService with player and host information**:
   ```typescript
   const syncService = new SynchronizationService({
     player: kalturaPlayer,
     hostId,
     isHost
   });
   ```

2. **Start the synchronization service**:
   ```typescript
   syncService.start();
   ```

3. **Request synchronization when needed**:
   ```typescript
   syncButton.addEventListener('click', () => {
     syncService.requestSync();
   });
   ```

4. **Handle host transfers**:
   ```typescript
   function transferHostTo(newHostId) {
     syncService.transferHost(newHostId);
   }
   
   function acceptHostTransfer(previousHostId) {
     syncService.acceptHostTransfer(previousHostId);
   }
   ```

### Best Practices

1. **Update presence regularly**: Call `updateUserPresence()` on user interactions
2. **Monitor network quality**: Periodically check and display network quality
3. **Provide visual feedback**: Show synchronization status to users
4. **Handle errors gracefully**: Implement fallbacks for network issues
5. **Test with various conditions**: Verify behavior under different network conditions