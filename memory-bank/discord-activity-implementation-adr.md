# Architecture Decision Record: Discord Activity Implementation for Kaltura Watch Together

## Status
Proposed

## Context
Our current Kaltura-Discord integration project includes a "Watch Together" feature that allows users to watch Kaltura videos in a synchronized manner while in a Discord voice channel. However, the current implementation is not using Discord's official Activities API, which would provide a more integrated and seamless experience for users.

We have reviewed the Discord Activity Starter example provided by Discord, which demonstrates how to build a proper embedded application that can run directly within Discord voice channels. This would allow us to create a true "Watch Together" experience where all users in a voice channel can watch the same Kaltura video simultaneously with synchronized playback controls.

## Current Implementation
Currently, our "Watch Together" feature:
1. Checks if the user is in a voice channel
2. Creates a custom HTML page with the Kaltura video player
3. Provides a link button that opens this page in a browser
4. Relies on users manually coordinating playback through voice chat

This approach has several limitations:
- Users must leave Discord to watch the video in a separate browser window
- No built-in synchronization of video playback between users
- No integration with Discord's voice channel UI
- Limited social experience as users are watching in separate windows

## Decision
We will implement a proper Discord Activity using Discord's Activities API and the embedded-app-sdk to create a true "Watch Together" experience for Kaltura videos. This will allow users to watch videos together directly within Discord voice channels with synchronized playback.

## Implementation Plan

### 1. Project Structure
We will create a new directory structure following the Discord Activity Starter example:

```
kaltura-discord/
└── discord-activity/
    ├── package.json
    ├── .env (for CLIENT_ID and CLIENT_SECRET)
    └── packages/
        ├── client/
        │   ├── index.html
        │   ├── package.json
        │   ├── tsconfig.json
        │   ├── vite.config.ts
        │   └── src/
        │       ├── discordSdk.ts
        │       ├── main.ts
        │       ├── style.css
        │       └── kalturaPlayer.ts (new file for Kaltura player integration)
        └── server/
            ├── environment.d.ts
            ├── package.json
            ├── tsconfig.json
            └── src/
                ├── app.ts
                ├── utils.ts
                └── shared/
                    └── kaltura.ts (shared Kaltura utilities)
```

### 2. Technical Components

#### Client-Side (Frontend)
1. **Discord SDK Integration**:
   - Initialize the Discord SDK with our application's client ID
   - Implement authorization flow to get necessary permissions
   - Use RPC to communicate with Discord client for voice channel information

2. **Kaltura Player Integration**:
   - Create a custom Kaltura player component that loads videos by ID
   - Implement playback controls (play, pause, seek, volume)
   - Add synchronization capabilities to keep all viewers in sync

3. **User Interface**:
   - Design a clean, Discord-themed UI for the video player
   - Add user presence indicators to show who's watching
   - Implement chat overlay or interaction with Discord's voice chat

#### Server-Side (Backend)
1. **Authentication Service**:
   - Handle OAuth2 flow with Discord
   - Exchange authorization code for access token
   - Manage Kaltura session (KS) generation for video access

2. **Synchronization Service**:
   - Track playback state across all viewers
   - Broadcast playback events (play, pause, seek) to all participants
   - Handle late-joiners by bringing them to the current playback position

3. **API Gateway**:
   - Create endpoints for video information retrieval
   - Proxy Kaltura API requests to avoid CORS issues
   - Handle token exchange and validation

### 3. Integration Points

#### Discord Integration
1. **Activities API**:
   - Register our application as an Activity with Discord
   - Configure the Activity to launch in voice channels
   - Set up proper scopes and permissions

2. **RPC Communication**:
   - Use Discord's RPC to get voice channel information
   - Communicate user presence and activity state
   - Handle voice channel events (join, leave)

#### Kaltura Integration
1. **Player Embedding**:
   - Use Kaltura's Player SDK to embed videos
   - Configure player with proper partner ID and UI configuration
   - Handle authentication and session management

2. **Video Metadata**:
   - Retrieve video details (title, duration, thumbnail)
   - Support different video types and formats
   - Handle playback restrictions and permissions

### 4. Authentication Flow
1. User initiates "Watch Together" for a Kaltura video in a Discord voice channel
2. Discord client launches our embedded application
3. Our application authenticates with Discord using OAuth2
4. We retrieve the user's Discord identity and map it to Kaltura permissions
5. Generate a Kaltura Session (KS) for the user
6. Initialize the Kaltura player with the KS and video ID

### 5. Synchronization Mechanism
1. Designate the user who initiated the activity as the "host"
2. Host's playback state is considered the source of truth
3. All playback control events from the host are broadcast to other viewers
4. Implement a heartbeat mechanism to keep all viewers in sync
5. Handle network latency and buffering differences between viewers

## Technical Requirements

### Dependencies
1. **Discord SDK**:
   - @discord/embedded-app-sdk: For embedding the application in Discord

2. **Kaltura Player**:
   - Kaltura Player.js: For video playback
   - Kaltura Player UI: For player controls and UI

3. **Development Tools**:
   - TypeScript: For type-safe development
   - Vite: For fast development and building
   - Express: For the backend server

### Environment Variables
1. **Discord Configuration**:
   - VITE_CLIENT_ID: Discord application client ID
   - CLIENT_SECRET: Discord application client secret

2. **Kaltura Configuration**:
   - KALTURA_PARTNER_ID: Kaltura partner ID
   - KALTURA_PLAYER_ID: Kaltura player UI configuration ID
   - KALTURA_API_ENDPOINT: Kaltura API endpoint

### Deployment Considerations
1. **Hosting**:
   - The application must be hosted on a publicly accessible HTTPS endpoint
   - Consider using a CDN for static assets
   - Ensure low-latency access for real-time synchronization

2. **Scaling**:
   - Design for horizontal scaling to handle multiple concurrent sessions
   - Implement session management to isolate different watch parties
   - Consider using WebSockets or similar for real-time communication

## Benefits
1. **Enhanced User Experience**:
   - Users can watch videos together without leaving Discord
   - Synchronized playback ensures everyone sees the same content at the same time
   - Integrated with Discord's voice chat for discussion during viewing

2. **Technical Advantages**:
   - Official Discord integration provides better reliability
   - Reduced complexity in synchronization by leveraging Discord's infrastructure
   - Better performance through optimized embedding

3. **Feature Parity**:
   - Brings our application in line with other Discord activities
   - Provides a modern, expected experience for Discord users
   - Opens possibilities for additional interactive features

## Risks and Mitigations

### Risks
1. **Discord API Access**:
   - Activities API requires approval from Discord
   - API changes could affect functionality

2. **Synchronization Challenges**:
   - Network latency can cause desynchronization
   - Different device capabilities may affect playback

3. **Browser Compatibility**:
   - Discord's embedded browser may have limitations
   - Mobile support may be limited

### Mitigations
1. **API Access**:
   - Begin application process for Activities API access immediately
   - Maintain the current implementation as a fallback

2. **Synchronization**:
   - Implement adaptive synchronization with configurable tolerance
   - Add manual sync button for users to resynchronize if needed

3. **Compatibility**:
   - Test across multiple platforms and devices
   - Implement feature detection and graceful degradation

## Implementation Phases

### Phase 1: Foundation
1. Set up project structure following Discord Activity Starter
2. Implement basic Discord SDK integration
3. Create simple Kaltura player embedding
4. Establish authentication flow

### Phase 2: Core Functionality
1. Implement synchronized playback controls
2. Add user presence and interaction features
3. Create server-side synchronization service
4. Test with multiple users in controlled environment

### Phase 3: Polish and Deployment
1. Optimize UI/UX for different devices and screen sizes
2. Add error handling and recovery mechanisms
3. Implement analytics and monitoring
4. Deploy to production environment

## Conclusion
Implementing a proper Discord Activity for our "Watch Together" feature will significantly enhance the user experience by allowing users to watch Kaltura videos together directly within Discord voice channels. This approach aligns with Discord's platform capabilities and user expectations, providing a more integrated and seamless experience.

The implementation will require development effort across both frontend and backend components, as well as coordination with Discord for Activities API access. However, the benefits in terms of user experience and feature capabilities make this a worthwhile investment for the project.

## References
1. Discord Activities API Documentation: https://discord.com/developers/docs/activities/overview
2. Discord Activity Starter Example: https://github.com/discord/embedded-app-sdk/tree/main/examples/discord-activity-starter
3. Kaltura Player Documentation: https://developer.kaltura.com/player