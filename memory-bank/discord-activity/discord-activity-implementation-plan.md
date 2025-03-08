# Discord Activity Implementation Plan for Kaltura Watch Together

## Overview

This document outlines the detailed implementation plan for converting our current "Watch Together" feature into a proper Discord Activity using Discord's Activities API and embedded-app-sdk. This implementation will allow users to watch Kaltura videos together directly within Discord voice channels with synchronized playback.

## Prerequisites

1. **Discord Developer Account with Activities API Access**
   - Apply for Activities API access through Discord Developer Portal
   - Create a new application or update existing application for Activities API
   - Configure OAuth2 credentials and redirect URIs

2. **Development Environment Setup**
   - Node.js 18+ with npm/pnpm
   - TypeScript development environment
   - Local development server with HTTPS capability (for testing)
   - Cloudflared or similar for tunnel testing

3. **Kaltura API Access**
   - Kaltura API credentials (partner ID, admin secret)
   - Kaltura Player UI configuration ID
   - Permissions to access video content

## Implementation Roadmap

### Phase 1: Project Setup and Foundation (2 weeks)

#### Week 1: Project Structure and Basic Integration

1. **Project Scaffolding**
   - Create directory structure based on Discord Activity Starter
   - Set up package.json files and dependencies
   - Configure TypeScript and build tools
   - Set up environment variables and configuration

2. **Discord SDK Integration**
   - Initialize Discord SDK with client ID
   - Implement basic authorization flow
   - Test connection to Discord client
   - Set up development tunnel for local testing

3. **Basic Kaltura Player Integration**
   - Create simple player component
   - Test video loading by ID
   - Implement basic playback controls
   - Handle player events

#### Week 2: Authentication and Core Services

1. **Authentication Service**
   - Implement OAuth2 flow with Discord
   - Create token exchange endpoint
   - Set up Kaltura session generation
   - Test authentication flow end-to-end

2. **API Gateway Setup**
   - Create Express server for backend
   - Set up proxy endpoints for Kaltura API
   - Implement error handling and logging
   - Configure CORS and security headers

3. **Basic UI Development**
   - Design player interface compatible with Discord
   - Implement responsive layout
   - Create loading states and error messages
   - Test across different screen sizes

### Phase 2: Core Functionality (3 weeks)

#### Week 3: Synchronization Mechanism

1. **Playback Synchronization**
   - Implement host designation logic
   - Create playback state tracking
   - Develop broadcast mechanism for playback events
   - Test synchronization between multiple clients

2. **User Presence**
   - Display who is currently watching
   - Show user avatars and names
   - Implement join/leave notifications
   - Track active/inactive viewers

3. **Error Handling and Recovery**
   - Handle network disconnections
   - Implement reconnection logic
   - Create recovery mechanisms for desynchronization
   - Test various failure scenarios

#### Week 4: Enhanced Player Features

1. **Advanced Player Controls**
   - Implement seeking with synchronization
   - Add quality selection options
   - Create volume controls
   - Add fullscreen toggle

2. **Chat Integration**
   - Display Discord chat alongside video
   - Add reaction capabilities
   - Implement timestamps for chat messages
   - Test chat functionality during playback

3. **Host Controls**
   - Add special controls for the host
   - Implement permissions management
   - Create host transfer capability
   - Test host authority features

#### Week 5: UI Polish and User Experience

1. **UI Refinement**
   - Polish visual design
   - Improve transitions and animations
   - Enhance accessibility features
   - Test with different Discord themes

2. **Mobile Optimization**
   - Adapt layout for mobile devices
   - Optimize touch controls
   - Test on various mobile screen sizes
   - Ensure responsive behavior

3. **Performance Optimization**
   - Optimize rendering performance
   - Reduce network overhead
   - Implement lazy loading where appropriate
   - Benchmark and profile application

### Phase 3: Testing and Deployment (2 weeks)

#### Week 6: Comprehensive Testing

1. **Unit and Integration Testing**
   - Write tests for core components
   - Test synchronization accuracy
   - Verify authentication flows
   - Test error handling

2. **Cross-Platform Testing**
   - Test on Windows, macOS, Linux
   - Verify mobile compatibility
   - Test with different Discord clients
   - Check browser compatibility

3. **Load and Stress Testing**
   - Test with multiple concurrent users
   - Simulate network conditions
   - Test with various video qualities
   - Verify server performance under load

#### Week 7: Deployment and Documentation

1. **Production Deployment**
   - Set up production hosting environment
   - Configure CI/CD pipeline
   - Deploy backend services
   - Set up monitoring and logging

2. **Documentation**
   - Create user documentation
   - Write developer documentation
   - Document API endpoints
   - Create troubleshooting guide

3. **Final Review and Launch**
   - Conduct security review
   - Perform final QA testing
   - Prepare launch announcement
   - Release to production

## Technical Implementation Details

### Client-Side Architecture

```
discord-activity/packages/client/
├── src/
│   ├── components/
│   │   ├── App.ts                 # Main application component
│   │   ├── KalturaPlayer.ts       # Kaltura player wrapper
│   │   ├── Controls.ts            # Playback controls
│   │   ├── UserPresence.ts        # User presence display
│   │   └── ErrorBoundary.ts       # Error handling component
│   ├── services/
│   │   ├── auth.ts                # Authentication service
│   │   ├── sync.ts                # Synchronization service
│   │   ├── api.ts                 # API client
│   │   └── events.ts              # Event handling
│   ├── utils/
│   │   ├── time.ts                # Time formatting utilities
│   │   ├── url.ts                 # URL handling
│   │   └── logger.ts              # Client-side logging
│   ├── discordSdk.ts              # Discord SDK initialization
│   ├── kalturaPlayer.ts           # Kaltura player initialization
│   ├── main.ts                    # Application entry point
│   └── style.css                  # Global styles
```

### Server-Side Architecture

```
discord-activity/packages/server/
├── src/
│   ├── controllers/
│   │   ├── auth.ts                # Authentication controller
│   │   ├── kaltura.ts             # Kaltura API controller
│   │   └── sync.ts                # Synchronization controller
│   ├── services/
│   │   ├── authService.ts         # Authentication service
│   │   ├── kalturaService.ts      # Kaltura API service
│   │   └── syncService.ts         # Synchronization service
│   ├── middleware/
│   │   ├── auth.ts                # Authentication middleware
│   │   ├── error.ts               # Error handling middleware
│   │   └── logging.ts             # Logging middleware
│   ├── utils/
│   │   ├── kaltura.ts             # Kaltura utilities
│   │   ├── discord.ts             # Discord utilities
│   │   └── logger.ts              # Server-side logging
│   ├── routes/
│   │   ├── auth.ts                # Authentication routes
│   │   ├── kaltura.ts             # Kaltura API routes
│   │   └── sync.ts                # Synchronization routes
│   ├── app.ts                     # Express application setup
│   └── index.ts                   # Server entry point
```

### Key Components

#### 1. Discord SDK Integration

```typescript
// src/discordSdk.ts
import { DiscordSDK } from '@discord/embedded-app-sdk';

export const discordSdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);

export async function initializeDiscordSDK() {
  await discordSdk.ready();
  
  // Authorize with Discord Client
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: [
      'applications.commands',
      'identify',
      'guilds',
      'guilds.members.read',
      'rpc.voice.read',
    ],
  });
  
  // Exchange code for token
  const response = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  
  const { access_token } = await response.json();
  
  // Authenticate with Discord client
  const auth = await discordSdk.commands.authenticate({
    access_token,
  });
  
  return auth;
}
```

#### 2. Kaltura Player Integration

```typescript
// src/kalturaPlayer.ts
export interface KalturaPlayerOptions {
  partnerId: string;
  uiconfId: string;
  targetId: string;
  entryId: string;
  ks?: string;
}

export class KalturaPlayerManager {
  private player: any;
  private options: KalturaPlayerOptions;
  private eventHandlers: Map<string, Function[]> = new Map();
  
  constructor(options: KalturaPlayerOptions) {
    this.options = options;
  }
  
  async initialize() {
    // Load Kaltura Player script
    await this.loadPlayerScript();
    
    // Initialize player
    this.player = KalturaPlayer.setup({
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
    
    // Load media
    await this.player.loadMedia({
      entryId: this.options.entryId,
      ks: this.options.ks
    });
    
    // Set up event listeners
    this.setupEventListeners();
    
    return this.player;
  }
  
  private async loadPlayerScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://cdnapisec.kaltura.com/p/${this.options.partnerId}/embedPlaykitJs/uiconf_id/${this.options.uiconfId}`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  private setupEventListeners() {
    // Set up basic event listeners
    this.player.addEventListener('playing', this.emitEvent.bind(this, 'playing'));
    this.player.addEventListener('pause', this.emitEvent.bind(this, 'pause'));
    this.player.addEventListener('seeking', this.emitEvent.bind(this, 'seeking'));
    this.player.addEventListener('seeked', this.emitEvent.bind(this, 'seeked'));
    this.player.addEventListener('ended', this.emitEvent.bind(this, 'ended'));
    this.player.addEventListener('error', this.emitEvent.bind(this, 'error'));
  }
  
  on(event: string, callback: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);
  }
  
  private emitEvent(event: string, data: any) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
  
  // Player control methods
  play() {
    this.player.play();
  }
  
  pause() {
    this.player.pause();
  }
  
  seek(time: number) {
    this.player.currentTime = time;
  }
  
  getCurrentTime() {
    return this.player.currentTime;
  }
  
  getDuration() {
    return this.player.duration;
  }
  
  destroy() {
    if (this.player) {
      this.player.destroy();
    }
  }
}
```

#### 3. Synchronization Service

```typescript
// src/services/sync.ts
import { discordSdk } from '../discordSdk';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  timestamp: number;
  hostId: string;
}

export class SynchronizationService {
  private hostId: string | null = null;
  private localState: PlaybackState | null = null;
  private player: any;
  private syncInterval: number | null = null;
  private syncTolerance = 2; // seconds
  
  constructor(player: any) {
    this.player = player;
  }
  
  initialize(isHost: boolean, userId: string) {
    if (isHost) {
      this.hostId = userId;
    }
    
    // Set up message listener for sync events
    window.addEventListener('message', this.handleSyncMessage.bind(this));
    
    // Start sync interval if we're the host
    if (isHost) {
      this.startSyncBroadcast();
    }
  }
  
  private startSyncBroadcast() {
    this.syncInterval = window.setInterval(() => {
      this.broadcastState();
    }, 5000) as unknown as number;
  }
  
  private broadcastState() {
    if (!this.hostId) return;
    
    const state: PlaybackState = {
      isPlaying: !this.player.paused,
      currentTime: this.player.currentTime,
      timestamp: Date.now(),
      hostId: this.hostId
    };
    
    // Send state to all participants via Discord SDK
    discordSdk.commands.sendMessage({
      type: 'PLAYBACK_SYNC',
      data: state
    });
  }
  
  private handleSyncMessage(event: MessageEvent) {
    // Only process messages from Discord SDK
    if (!event.data || event.data.type !== 'PLAYBACK_SYNC') return;
    
    const state = event.data.data as PlaybackState;
    
    // Ignore our own messages if we're the host
    if (state.hostId === this.hostId) return;
    
    // Update local state
    this.localState = state;
    
    // Sync playback
    this.syncPlayback();
  }
  
  private syncPlayback() {
    if (!this.localState) return;
    
    // Calculate time adjustment based on message timestamp
    const timeElapsed = (Date.now() - this.localState.timestamp) / 1000;
    const adjustedTime = this.localState.currentTime + timeElapsed;
    
    // Check if we need to seek
    const currentTime = this.player.currentTime;
    if (Math.abs(currentTime - adjustedTime) > this.syncTolerance) {
      this.player.currentTime = adjustedTime;
    }
    
    // Match play/pause state
    if (this.localState.isPlaying && this.player.paused) {
      this.player.play();
    } else if (!this.localState.isPlaying && !this.player.paused) {
      this.player.pause();
    }
  }
  
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('message', this.handleSyncMessage.bind(this));
  }
}
```

#### 4. Authentication Controller

```typescript
// src/controllers/auth.ts
import { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function handleTokenExchange(req: Request, res: Response) {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Exchange code for token with Discord
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return res.status(tokenResponse.status).json({
        error: 'Failed to exchange code for token',
        details: tokenData
      });
    }
    
    // Return the access token to the client
    return res.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Integration with Existing Codebase

### 1. Update to kalturaActivity.ts

The current `launchKalturaVideoActivity` function in `kalturaActivity.ts` will need to be updated to launch the Discord Activity when appropriate:

```typescript
export async function launchKalturaVideoActivity(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  videoId: string
): Promise<void> {
  try {
    // Defer reply to give us time to process
    await interaction.deferReply({ ephemeral: false });

    // Get the video details
    const video = await kalturaClient.getVideo(videoId);

    // Check if the user is in a voice channel (for Watch Together feature)
    const isInVoiceChannel = interaction.member instanceof GuildMember &&
      interaction.member.voice.channel !== null;

    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';

    // Get server-specific configuration
    const config = await configService.getServerConfig(serverId);

    // Extract partner ID from the video play URL
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    
    // Get the uiConfID from environment variable
    const uiconfId = getEnv('KALTURA_PLAYER_ID', '46022343');

    // Create action buttons for the video
    const actionRowComponents = [
      {
        type: 2, // Button
        style: 5, // Link style
        label: '▶️ Watch Video',
        url: `https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}?iframeembed=true&entry_id=${video.id}`
      },
      {
        type: 2, // Button
        style: 1, // Primary style
        label: '📺 Get Video Link & Embed Code',
        custom_id: `inline_activity_${video.id}`
      }
    ];

    // Add Watch Together button if user is in a voice channel
    if (isInVoiceChannel) {
      // Check if Discord Activities API is available for this server
      const hasActivitiesAccess = await checkActivitiesApiAccess(serverId);
      
      if (hasActivitiesAccess) {
        // Use Discord's Activities API for Watch Together
        actionRowComponents.push({
          type: 2, // Button
          style: 3, // Success style (green)
          label: '👥 Watch Together (Discord Activity)',
          custom_id: `discord_activity_${video.id}`
        });
      } else {
        // Fall back to our custom implementation
        actionRowComponents.push({
          type: 2, // Button
          style: 3, // Success style (green)
          label: '👥 Watch Together',
          custom_id: `watch_together_${video.id}`
        });
      }
    }

    const actionRow = {
      type: 1, // Action Row
      components: actionRowComponents
    };

    // Create a rich embed for the video
    const videoEmbed = {
      title: video.title,
      description: video.description || 'No description provided',
      color: 0x00B171, // Kaltura green
      fields: [
        {
          name: 'Video Info',
          value: `⏱️ \`${formatDuration(video.duration)}\` • 👁️ ${video.views} views • 📅 ${new Date(video.createdAt).toLocaleDateString()}`,
          inline: false
        }
      ],
      image: {
        url: video.thumbnailUrl
      },
      footer: {
        text: `Kaltura Video • ID: ${video.id}`
      }
    };

    await interaction.editReply({
      content: `${interaction.user} shared a Kaltura video: **${video.title}**\n\nClick the buttons below to watch the video.`,
      embeds: [videoEmbed],
      components: [actionRow]
    });

    logger.info('Shared Kaltura video in Discord channel', {
      user: interaction.user.tag,
      videoId: video.id,
      channel: interaction.channelId
    });
  } catch (error) {
    logger.error('Error sharing Kaltura video to channel', { error, videoId });

    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to share video to channel. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to share video to channel. Please try again later.',
        ephemeral: true
      });
    }
  }
}

// Helper function to check if Activities API is available
async function checkActivitiesApiAccess(serverId: string): Promise<boolean> {
  try {
    // Get server-specific configuration
    const config = await configService.getServerConfig(serverId);
    
    // Check if Activities API is enabled in configuration
    return config.discord?.features?.activitiesApi?.enabled === true;
  } catch (error) {
    logger.error('Error checking Activities API access', { error, serverId });
    return false;
  }
}
```

### 2. Update to interactions.ts

Add a new handler for the Discord Activity button in `interactions.ts`:

```typescript
// Handle Discord Activity button
if (customId.startsWith('discord_activity_')) {
  const videoId = customId.replace('discord_activity_', '');
  await handleDiscordActivity(interaction, videoId);
  return;
}

/**
 * Handle Discord Activity button click
 * Launches a proper Discord Activity for watching Kaltura videos together
 */
async function handleDiscordActivity(interaction: ButtonInteraction, videoId: string): Promise<void> {
  try {
    // Defer reply to give us time to process
    await interaction.deferReply({ ephemeral: false });
    
    // Check if the user is in a voice channel
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
      await interaction.editReply({
        content: 'You need to be in a voice channel to use Watch Together!'
      });
      return;
    }
    
    // Get the voice channel
    const voiceChannel = interaction.member.voice.channel;
    
    // Get the video details
    const video = await kalturaClient.getVideo(videoId);
    
    // Extract partner ID from the video play URL
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    
    // Get the uiConfID from environment variable
    const uiconfId = getEnv('KALTURA_PLAYER_ID', '46022343');
    
    // Create the Discord Activity URL
    const activityUrl = new URL('https://discord.com/activities');
    
    // Add application ID (this would be your Discord application ID)
    const applicationId = getEnv('DISCORD_APPLICATION_ID', '');
    
    // Create metadata for the activity
    const metadata = {
      videoId,
      partnerId,
      uiconfId,
      title: video.title
    };
    
    // Launch the Discord Activity
    try {
      await interaction.editReply({
        content: `${interaction.user} started a Watch Together activity for **${video.title}**!\n\nJoin voice channel "${voiceChannel.name}" to watch together.`,
        embeds: [{
          title: `Watch Together: ${video.title}`,
          description: "Click the button below to launch the Watch Together activity in your voice channel.",
          color: 0x00B171, // Kaltura green
          image: {
            url: video.thumbnailUrl
          },
          footer: {
            text: `Kaltura Video • ID: ${video.id}`
          }
        }],
        components: [{
          type: 1, // Action Row
          components: [{
            type: 2, // Button
            style: 5, // Link
            label: '🎬 Launch Watch Together Activity',
            url: `https://discord.com/activities/${applicationId}?metadata=${encodeURIComponent(JSON.stringify(metadata))}`
          }]
        }]
      });
      
      logger.info('Launched Discord Activity for video', {
        user: interaction.user.tag,
        videoId,
        voiceChannel: voiceChannel.name
      });
    } catch (error) {
      logger.error('Failed to launch Discord Activity', { error, videoId });
      
      // Provide a fallback option
      await interaction.editReply({
        content: `Failed to launch Discord Activity. You can still use our standard Watch Together feature.`,
        components: [{
          type: 1, // Action Row
          components: [{
            type: 2, // Button
            style: 1, // Primary
            label: '👥 Use Standard Watch Together',
            custom_id: `watch_together_${videoId}`
          }]
        }]
      });
    }
  } catch (error) {
    logger.error('Error handling Discord Activity button', { error, videoId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to launch Discord Activity. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to launch Discord Activity. Please try again later.',
        ephemeral: true
      });
    }
  }
}
```

## Configuration Updates

### 1. Environment Variables

Add the following environment variables to `.env.example`:

```
# Discord Activity Configuration
DISCORD_APPLICATION_ID=your_discord_application_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_ACTIVITY_URL=https://your-activity-url.com
```

### 2. Configuration Service

Update the configuration schema to include Discord Activities API settings:

```json
{
  "discord": {
    "features": {
      "activitiesApi": {
        "enabled": false,
        "applicationId": "",
        "activityUrl": ""
      }
    }
  }
}
```

## Testing Strategy

1. **Local Development Testing**
   - Use cloudflared tunnel for local development
   - Test with a small group of users in a Discord server
   - Verify synchronization across different devices

2. **Integration Testing**
   - Test integration with existing bot commands
   - Verify fallback mechanisms work correctly
   - Test error handling and recovery

3. **Performance Testing**
   - Test with different video qualities
   - Measure synchronization accuracy
   - Test with varying network conditions
   - Verify resource usage (CPU, memory, network)

4. **User Acceptance Testing**
   - Gather feedback from a small group of users
   - Test usability across different devices
   - Verify the experience meets user expectations

## Rollout Plan

1. **Alpha Release**
   - Deploy to a limited set of servers
   - Gather feedback and metrics
   - Fix critical issues

2. **Beta Release**
   - Expand to more servers
   - Continue gathering feedback
   - Implement improvements based on alpha feedback

3. **General Availability**
   - Release to all servers
   - Monitor usage and performance
   - Provide documentation and support

## Success Metrics

1. **User Engagement**
   - Number of Watch Together sessions started
   - Average session duration
   - Number of users per session

2. **Technical Performance**
   - Synchronization accuracy
   - Error rate
   - Server resource utilization

3. **User Satisfaction**
   - Feedback ratings
   - Feature requests
   - Reported issues

## Conclusion

This implementation plan provides a comprehensive roadmap for converting our current "Watch Together" feature into a proper Discord Activity. By following this plan, we will create a seamless, integrated experience for users to watch Kaltura videos together directly within Discord voice channels.

The plan includes detailed technical specifications, integration points with our existing codebase, and a phased rollout strategy to ensure a smooth transition to the new implementation. By leveraging Discord's Activities API, we will provide a more robust and user-friendly experience that aligns with Discord's platform capabilities and user expectations.