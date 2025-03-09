# Enhanced User Presence Specification

## Overview

This document provides a detailed specification for enhancing user presence features in the Kaltura Discord Activity. These enhancements will provide users with more detailed information about other participants, improve synchronization between viewers, and create a more engaging and interactive watch-together experience.

## Current Limitations

The current implementation has several limitations in user presence functionality:

1. **Basic Presence Information**: Only shows who is in the activity without detailed status
2. **Limited Synchronization Feedback**: Users don't know if they're properly synchronized with the host
3. **No Network Quality Indicators**: No visibility into connection quality issues affecting playback
4. **Static User List**: User list doesn't dynamically update with status changes
5. **Limited Host Controls**: Minimal visual indicators for host status and controls

## Enhanced User Presence Features

### 1. Detailed User Status

Each participant will have an enhanced status that includes:

- **Activity Status**: Active, Inactive, or Away
- **Playback State**: Playing, Paused, Buffering, or Seeking
- **Current Timestamp**: Where in the video the user is currently watching
- **Last Activity Time**: When the user last interacted with the player
- **Host Indicator**: Clear visual indication of who is the host

#### Implementation Details

```typescript
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
    seeking: boolean;
  };
  networkQuality?: 'good' | 'fair' | 'poor';
}
```

The system will automatically update a user's status based on:
- **Active**: User has interacted with the player in the last 2 minutes
- **Inactive**: No interaction for 2-5 minutes
- **Away**: No interaction for more than 5 minutes

### 2. Network Quality Monitoring

The system will monitor network conditions and synchronization performance to provide:

- **Network Quality Indicator**: Visual indicator showing connection quality (Good, Fair, Poor)
- **Sync Status**: Indication of how well a user is synchronized with the host
- **Adaptive Synchronization**: Adjusting sync tolerance based on network conditions

#### Implementation Details

```typescript
export interface SyncMetrics {
  syncAttempts: number;
  syncSuccesses: number;
  averageSyncDelta: number; // Average time difference in seconds
  lastSyncTime: number; // timestamp
  networkQuality: 'good' | 'fair' | 'poor';
}
```

Network quality will be determined by:
- **Good**: Average sync delta < 0.5 seconds, high sync success rate
- **Fair**: Average sync delta between 0.5-2 seconds
- **Poor**: Average sync delta > 2 seconds or frequent sync failures

### 3. Real-time Presence Updates

The system will provide real-time updates when:

- A user joins or leaves the activity
- A user's playback state changes (play/pause/seek)
- A user's network quality changes
- A user's status changes (active/inactive/away)

#### Implementation Details

```typescript
// Event types for presence updates
type PresenceEventType = 
  | 'USER_JOIN'
  | 'USER_LEAVE'
  | 'PLAYBACK_CHANGE'
  | 'NETWORK_CHANGE'
  | 'STATUS_CHANGE'
  | 'HOST_CHANGE';

// Event payload
interface PresenceEvent {
  type: PresenceEventType;
  userId: string;
  timestamp: number;
  data?: any;
}
```

Events will be broadcast to all participants using the Discord SDK's messaging system, with appropriate throttling to prevent excessive updates.

### 4. Enhanced User Interface

The UI will be updated to display the enhanced presence information:

- **User List**: Shows all participants with status indicators
- **Network Quality**: Visual indicator for each user's connection quality
- **Playback Status**: Shows if a user is playing, paused, or buffering
- **Sync Status**: Indicates if a user is in sync with the host
- **Host Controls**: Enhanced controls for the host user

#### UI Components

1. **User Entry**:
   - Username
   - Status indicator (colored dot)
   - Host badge (if applicable)
   - Network quality indicator (signal bars)
   - Playback status icon
   - Current timestamp (optional)

2. **Sync Status Panel**:
   - Visual indicator of sync status with host
   - "Sync with Host" button for manual synchronization
   - Last successful sync time

3. **Host Controls Panel** (visible only to host):
   - Force sync all users button
   - Transfer host status button
   - Lock/unlock playback controls

### 5. Adaptive Synchronization

The system will adapt synchronization behavior based on network conditions:

- **Good Network**: Strict synchronization (±0.5s tolerance)
- **Fair Network**: Moderate synchronization (±1.5s tolerance)
- **Poor Network**: Relaxed synchronization (±3s tolerance)
- **Critical Issues**: Notification to user about sync problems

#### Implementation Details

```typescript
function calculateSyncTolerance(networkQuality: 'good' | 'fair' | 'poor'): number {
  switch (networkQuality) {
    case 'good':
      return 0.5; // 0.5 seconds tolerance
    case 'fair':
      return 1.5; // 1.5 seconds tolerance
    case 'poor':
      return 3.0; // 3 seconds tolerance
    default:
      return 2.0; // Default tolerance
  }
}
```

### 6. Presence Analytics

The system will collect anonymous analytics about user presence to help improve the experience:

- **Session Duration**: How long users stay in the activity
- **Sync Issues**: Frequency and severity of synchronization problems
- **Network Quality**: Distribution of connection quality among users
- **Engagement Metrics**: Play/pause frequency, seek actions, etc.

## User Experience Improvements

These enhanced presence features will improve the user experience in several ways:

1. **Better Group Awareness**: Users will have a clear understanding of who is watching and their current status
2. **Improved Synchronization**: Adaptive sync and network quality indicators will help users stay in sync
3. **Reduced Frustration**: Clear indicators when network issues are affecting the experience
4. **Enhanced Social Experience**: More detailed presence information creates a stronger sense of watching together
5. **Better Host Controls**: Hosts have more visibility and control over the shared experience

## Technical Implementation

### Client-Side Changes

1. **User Presence Tracking**:
   - Monitor user interactions with the player
   - Track idle time to determine status
   - Broadcast status changes to other participants

2. **Network Monitoring**:
   - Measure synchronization accuracy
   - Calculate network quality metrics
   - Adapt synchronization behavior accordingly

3. **UI Updates**:
   - Enhanced user list component
   - Network quality indicators
   - Sync status display
   - Host controls panel

### Server-Side Changes

1. **Presence Aggregation**:
   - Collect presence information from all participants
   - Distribute presence updates efficiently
   - Handle late-joining participants

2. **Analytics Collection**:
   - Anonymize and aggregate presence data
   - Track key metrics for quality improvement
   - Generate insights for future enhancements

## CSS Styling

```css
/* User status indicators */
.user-status {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-active {
  background-color: #43b581;
}

.status-inactive {
  background-color: #faa61a;
}

.status-away {
  background-color: #f04747;
}

/* Network quality indicators */
.network-quality {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-left: 8px;
  background-size: contain;
  background-repeat: no-repeat;
}

.network-good {
  background-image: url('assets/network-good.svg');
}

.network-fair {
  background-image: url('assets/network-fair.svg');
}

.network-poor {
  background-image: url('assets/network-poor.svg');
}

/* Playback status */
.playback-status {
  display: inline-block;
  margin-left: 8px;
  font-size: 14px;
}

.playback-playing::before {
  content: '▶️';
}

.playback-paused::before {
  content: '⏸️';
}

.playback-buffering::before {
  content: '⏳';
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

/* Sync status panel */
.sync-status {
  display: flex;
  align-items: center;
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.sync-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 8px;
}

.sync-good {
  background-color: #43b581;
}

.sync-warning {
  background-color: #faa61a;
}

.sync-error {
  background-color: #f04747;
}

/* User list animations */
@keyframes statusChange {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

.status-changing {
  animation: statusChange 1s ease-in-out;
}
```

## Mobile Considerations

The enhanced presence features will be responsive and work well on mobile devices:

1. **Compact User List**: Simplified view that shows essential information
2. **Touch-Friendly Controls**: Larger tap targets for sync and control buttons
3. **Reduced Information Density**: Focus on most important status indicators
4. **Orientation Support**: Proper layout in both portrait and landscape modes

## Accessibility Considerations

The enhanced presence features will be designed with accessibility in mind:

1. **Screen Reader Support**: All status indicators will have proper ARIA labels
2. **Color Blind Friendly**: Status indicators will use both color and shape
3. **Keyboard Navigation**: All controls will be accessible via keyboard
4. **Focus Management**: Proper focus handling for interactive elements

## Conclusion

The enhanced user presence features will significantly improve the watch-together experience in the Kaltura Discord Activity. By providing more detailed information about participants, their playback status, and network conditions, users will have a more engaging and synchronized viewing experience. The adaptive synchronization system will help maintain a cohesive experience even in challenging network conditions.