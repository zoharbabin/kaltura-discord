# Discord Activity Implementation Alignment

## Current Implementation Analysis

After reviewing the codebase and the official Discord Activity documentation, I've identified several areas where our implementation needs to be updated to align with the latest Discord Activity SDK requirements and best practices.

### Current Architecture

Our Discord Activity implementation consists of:

1. **Backend Components**:
   - `kalturaActivity.ts`: Handles launching Discord Activities from the bot
   - `interactions.ts`: Processes button interactions for launching activities

2. **Frontend Components**:
   - `discordSdk.ts`: Initializes and manages the Discord SDK connection
   - `main.ts`: Main application entry point and UI management
   - `kalturaPlayer.ts`: Manages the Kaltura video player
   - `syncService.ts`: Handles synchronization between participants

### Current Implementation Approach

The current implementation:
- Uses the Discord Embedded App SDK for communication with Discord
- Implements a host-based synchronization model where one user controls playback
- Uses `window.postMessage` for communication between participants
- Manually handles authentication and authorization flows
- Passes video metadata through URL parameters

## Discord Activity Documentation Analysis

The official Discord Activity documentation outlines:

1. **SDK Structure**:
   - The SDK provides commands and events for communication with Discord
   - Commands are used to interact with the Discord client
   - Events are used to listen for changes in the Discord client

2. **Authentication Flow**:
   - The SDK provides `authorize` and `authenticate` commands
   - The authorization flow requires a server-side token exchange

3. **Activity Lifecycle**:
   - Activities are launched from Discord commands or interactions
   - Activities run in an iframe within Discord
   - Activities can access Discord features through the SDK

4. **SDK Commands and Events**:
   - Commands like `getChannel`, `getInstanceConnectedParticipants`, etc.
   - Events like `ACTIVITY_LAYOUT_MODE_UPDATE`, `ORIENTATION_UPDATE`, etc.

## Alignment Gaps

Based on the analysis, here are the key areas where our implementation needs to be aligned with the official documentation:

1. **SDK Initialization and Usage**:
   - Our implementation uses an older approach to SDK initialization
   - We need to update to the latest SDK methods and patterns

2. **Authentication Flow**:
   - Our implementation needs to be updated to use the latest authentication flow
   - We should ensure we're requesting the correct scopes

3. **Participant Management**:
   - We should use `getInstanceConnectedParticipants` instead of custom tracking
   - We need to properly handle participant join/leave events

4. **Communication Between Participants**:
   - We're using `window.postMessage` which is not the recommended approach
   - We should investigate if there are SDK-provided methods for this

5. **Activity Layout and Orientation**:
   - We need to handle `ACTIVITY_LAYOUT_MODE_UPDATE` and `ORIENTATION_UPDATE` events
   - We should optimize the UI for different layout modes

6. **Error Handling**:
   - We need to properly handle SDK errors and provide user feedback
   - We should implement graceful degradation for unsupported features

## Recommended Changes

### 1. SDK Initialization and Usage

Update `discordSdk.ts` to use the latest SDK initialization pattern:

```typescript
import { DiscordSDK } from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);

async function setupDiscordSdk() {
  await discordSdk.ready();
  // Continue with authorization
}
```

### 2. Authentication Flow

Update the authentication flow to match the recommended pattern:

```typescript
// Authorize with Discord Client
const { code } = await discordSdk.commands.authorize({
  client_id: import.meta.env.VITE_CLIENT_ID,
  response_type: "code",
  state: "",
  prompt: "none",
  scope: [
    "identify",
    "guilds",
    "guilds.members.read",
    "rpc.voice.read",
  ],
});

// Exchange code for token via proxy to avoid CSP issues
const response = await fetch("/.proxy/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ code }),
});
const tokenData = await response.json();

// Authenticate with Discord client
const authResult = await discordSdk.commands.authenticate({
  access_token: tokenData.access_token,
});
```

### 3. Participant Management

Replace our custom participant tracking with SDK methods:

```typescript
async function getParticipants() {
  const participants = await discordSdk.commands.getInstanceConnectedParticipants();
  return participants;
}
```

### 4. Event Handling

Implement proper event subscription:

```typescript
// Subscribe to layout mode changes
await discordSdk.subscribe("ACTIVITY_LAYOUT_MODE_UPDATE", (data) => {
  updateLayoutMode(data.layout_mode);
});

// Subscribe to orientation changes
await discordSdk.subscribe("ORIENTATION_UPDATE", (data) => {
  updateOrientation(data.screen_orientation);
});

// Subscribe to participant updates
await discordSdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", (data) => {
  updateParticipants(data.participants);
});
```

### 5. Activity Metadata

Update how we pass and retrieve activity metadata:

```typescript
// In kalturaActivity.ts (when launching the activity)
const metadata = {
  videoId,
  partnerId,
  uiconfId,
  title: video.title,
  creatorId: interaction.user.id
};

const activityUrl = `${activityBaseUrl}/${applicationId}?metadata=${encodeURIComponent(JSON.stringify(metadata))}`;

// In main.ts (when retrieving metadata)
// The SDK provides the metadata directly, no need to parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const metadata = JSON.parse(decodeURIComponent(urlParams.get('metadata') || '{}'));
const { videoId, partnerId, uiconfId, creatorId } = metadata;
```

### 6. Mobile Optimization

Implement responsive design and handle orientation changes:

```typescript
// Set orientation lock state for mobile
if (isMobileDevice) {
  await discordSdk.commands.setOrientationLockState({
    lock_state: Common.OrientationLockStateTypeObject.LANDSCAPE,
    picture_in_picture_lock_state: Common.OrientationLockStateTypeObject.LANDSCAPE,
    grid_lock_state: Common.OrientationLockStateTypeObject.UNLOCKED
  });
}
```

## Implementation Plan

1. **Update SDK Integration**:
   - Update to the latest SDK version
   - Refactor SDK initialization and authentication

2. **Enhance Participant Management**:
   - Implement SDK-based participant tracking
   - Update UI to show participant status

3. **Optimize for Different Layouts**:
   - Handle layout mode changes
   - Optimize UI for mobile devices

4. **Improve Synchronization**:
   - Investigate SDK-provided methods for communication
   - Enhance the host-based synchronization model

5. **Error Handling and Fallbacks**:
   - Implement comprehensive error handling
   - Provide fallbacks for unsupported features

6. **Testing**:
   - Test on different Discord clients (desktop, mobile, web)
   - Test with different network conditions

## Conclusion

Aligning our Discord Activity implementation with the official documentation will improve compatibility, reliability, and user experience. The changes outlined above will ensure our implementation follows Discord's recommended patterns and best practices while maintaining our core functionality of synchronized video watching.