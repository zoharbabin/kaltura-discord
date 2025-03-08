# Kaltura-Discord Integration

A seamless integration between Kaltura's video platform and Discord, allowing users to share, watch together, and interact with Kaltura videos directly from Discord without additional installations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Discord Commands](#discord-commands)
- [API Endpoints](#api-endpoints)
- [Discord Activity](#discord-activity)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Troubleshooting](#troubleshooting)

## Overview

The Kaltura-Discord integration bridges the gap between Discord's community-focused platform and Kaltura's professional video platform. This integration enables educational institutions, businesses, and communities to leverage both platforms' strengths:

- **Discord**: Community building, persistent chat, voice channels, and social engagement
- **Kaltura**: Enterprise-grade video management, streaming, and interactive features

By integrating these platforms, we create a seamless experience that eliminates friction between community engagement and video content.

## Features

- **Discord Bot Integration**: Share, search, and manage Kaltura videos directly from Discord
- **Watch Together**: Watch Kaltura videos together in Discord voice channels
- **Automatic Authentication**: Discord identity is used to authenticate with Kaltura automatically
- **Role-Based Access**: Discord roles determine Kaltura permissions without manual configuration
- **Server-Specific Configuration**: Each Discord server can have its own configuration
- **Secure Link Generation**: Generate secure video links with appropriate permissions
- **API Gateway**: RESTful API for integration with other services

## Architecture

The integration is built using a microservices architecture with the following components:

1. **Discord Bot Service**: Handles Discord interactions and commands
2. **API Gateway**: Routes requests and manages authentication
3. **Kaltura Integration Service**: Interfaces with Kaltura APIs
4. **User Authentication Service**: Manages identity mapping and token generation
5. **Configuration Service**: Manages server-specific configurations
6. **Discord Activity Service**: Provides embedded video watching experience

## Prerequisites

- Node.js v18 or higher
- npm v8 or higher (or pnpm v8 or higher)
- Discord Bot Token and Client ID (from [Discord Developer Portal](https://discord.com/developers/applications))
- Kaltura Partner ID and Admin Secret (from Kaltura Management Console)
- Cloudflare account (for production deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kaltura/kaltura-discord.git
   cd kaltura-discord
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your credentials:
   ```
   # Discord Configuration
   DISCORD_BOT_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   DISCORD_APPLICATION_ID=your_discord_application_id
   
   # Kaltura API Configuration
   KALTURA_PARTNER_ID=your_kaltura_partner_id
   KALTURA_ADMIN_SECRET=your_kaltura_admin_secret
   KALTURA_API_ENDPOINT=https://www.kaltura.com/api_v3
   KALTURA_PLAYER_ID=your_kaltura_player_id
   
   # API Gateway Configuration
   API_PORT=3000
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRY=1h
   
   # Logging Configuration
   LOG_LEVEL=info
   ```

5. Create necessary directories:
   ```bash
   mkdir -p logs
   mkdir -p config/overrides
   ```

6. Run the setup and test script:
   ```bash
   chmod +x setup-and-test.sh
   ./setup-and-test.sh
   ```

## Configuration

### Default Configuration

The default configuration is stored in `config/default_config.json`. This configuration is used as a base for all Discord servers.

### Server-Specific Configuration

Each Discord server can have its own configuration that overrides the default settings. Server-specific configurations are stored in `config/overrides/{server_id}.json`.

You can manage server configurations using the Discord bot commands:
- `/kaltura-config-view`: View the current configuration
- `/kaltura-config-update`: Update a configuration setting
- `/kaltura-config-reset`: Reset configuration to defaults

### Configuration Structure

```json
{
  "notifications": {
    "enabled": true,
    "types": {
      "meeting_start": true,
      "meeting_end": true,
      "user_join": false,
      "recording_ready": true
    },
    "templates": {
      "meeting_start": "A new {{type}} has started: **{{title}}**",
      "meeting_end": "The {{type}} **{{title}}** has ended",
      "user_join": "{{username}} has joined the {{type}} **{{title}}**",
      "recording_ready": "Recording for **{{title}}** is now available",
      "meeting_share": "@here {{username}} is inviting you to join a {{type}}: **{{title}}**"
    },
    "channels": {
      "default": "general",
      "recording_ready": "recordings"
    }
  },
  "commands": {
    "enabled": true,
    "prefix": "",
    "permissions": {
      "kaltura-video-search": ["@everyone"],
      "kaltura-config-view": ["admin"],
      "kaltura-config-update": ["admin"],
      "kaltura-config-reset": ["admin"]
    }
  },
  "roles": {
    "mapping": {
      "admin": "admin",
      "moderator": "moderator",
      "default": "viewer"
    }
  },
  "features": {
    "embedding": true,
    "recording": true,
    "user_sync": true,
    "activitiesApi": false,
    "discordApplicationId": "",
    "discordActivityUrl": "{{DISCORD_ACTIVITY_URL}}"
  },
  "kaltura": {
    "session": {
      "privileges": {
        "default": "",
        "video": "genieid:default,privacycontext:2361952EPea2653e,virtualeventid:2361952,searchcontext:2361952EPea2653e,eventsessioncontextid:*,appid:eventplatform-hackerspacelive.events.kaltura.com",
        "meeting": "virtualeventid:2361952,eventsessioncontextid:*,appid:*"
      }
    },
    "video": {
      "embedBaseUrl": "https://hackerspacelive.events.kaltura.com/media/t/"
    }
  }
}
```

## Usage

### Discord Bot Setup

The integration includes an automated setup script to help configure your Discord bot:

```bash
npm run setup:discord
```

This script will:
1. Validate your Discord bot token
2. Check which intents are enabled
3. Generate an OAuth2 URL for adding the bot to servers
4. Provide guidance for manual steps in the Discord Developer Portal

For detailed instructions, see the [Discord Bot Setup Guide](docs/discord-bot-setup.md).

### Adding the Bot to Your Discord Server

The setup script will generate an OAuth2 URL for you, or you can manually create one:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to the "OAuth2" section
4. Under "OAuth2 URL Generator", select the following scopes:
   - `bot`
   - `applications.commands`
5. Under "Bot Permissions", select:
   - `Send Messages`
   - `Embed Links`
   - `Read Message History`
   - `Use Slash Commands`
6. Copy the generated URL and open it in your browser
7. Select the Discord server you want to add the bot to and follow the prompts

### Starting the Bot

For development:
```bash
./deploy-dev.sh
```

For production:
```bash
./deploy-prod.sh
```

## Discord Commands

The integration provides the following Discord slash commands:

### Video Management

- `/kaltura-video-search`: Search for Kaltura videos
  - Options:
    - `query`: Search query
    - `limit`: Maximum number of results (optional)

- `/kaltura-video-info`: Get information about a Kaltura video
  - Options:
    - `video-id`: ID of the video

### Configuration Management

- `/kaltura-config-view`: View the current Kaltura configuration for this server
  - Options:
    - `section`: Configuration section to view (all, notifications, commands, roles, features)

- `/kaltura-config-update`: Update the Kaltura configuration for this server
  - Options:
    - `section`: Configuration section to update (notifications, commands, roles, features)
    - `key`: Configuration key to update (e.g., notifications.enabled, roles.mapping.admin)
    - `value`: New value for the configuration key

- `/kaltura-config-reset`: Reset the Kaltura configuration for this server to defaults
  - Options:
    - `section`: Configuration section to reset (all, notifications, commands, roles, features)
    - `confirm`: Confirm reset (required)

## API Endpoints

The integration provides a RESTful API for integration with other services.

### Authentication

All API endpoints require authentication using a JWT token. You can obtain a token by calling the `/api/auth/token` endpoint.

#### Generate a Token

```
POST /api/auth/token
```

Request body:
```json
{
  "discordId": "123456789",
  "username": "username",
  "roles": ["admin", "moderator"]
}
```

Response:
```json
{
  "token": "jwt_token",
  "expiresAt": "2023-01-01T00:00:00.000Z",
  "user": {
    "discordId": "123456789",
    "discordUsername": "username",
    "kalturaUserId": "discord_123456789",
    "kalturaRole": "admin"
  },
  "kalturaSession": {
    "ks": "kaltura_session_token",
    "partnerId": "12345",
    "userId": "discord_123456789",
    "expiry": 1672531200,
    "privileges": "admin"
  }
}
```

### Video Endpoints

#### Search Videos

```
GET /api/kaltura/videos?query=search_term&limit=10
```

Response:
```json
{
  "videos": [
    {
      "id": "video_id",
      "title": "Video Title",
      "description": "Video Description",
      "thumbnailUrl": "https://kaltura.com/thumbnail/video_id",
      "duration": 120,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "views": 100
    }
  ]
}
```

#### Get Video

```
GET /api/kaltura/video/:id
```

Response:
```json
{
  "video": {
    "id": "video_id",
    "title": "Video Title",
    "description": "Video Description",
    "thumbnailUrl": "https://kaltura.com/thumbnail/video_id",
    "duration": 120,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "views": 100,
    "playUrl": "https://kaltura.com/play/video_id"
  }
}
```

#### Generate Session

```
POST /api/kaltura/session
```

Request body:
```json
{
  "videoId": "video_id",
  "userId": "discord_123456789"
}
```

Response:
```json
{
  "ks": "kaltura_session_token"
}
```

## Discord Activity

The integration includes a Discord Activity for watching Kaltura videos together in Discord voice channels.

### Features

- Watch Kaltura videos together in Discord voice channels
- Synchronized playback across all participants
- Host controls for playback (play, pause, seek)
- Real-time presence information
- Chat while watching

### Usage

1. Share a Kaltura video in Discord using the `/kaltura-video-search` command
2. Join a voice channel
3. Click the "Watch Together" button
4. The Discord Activity will launch in the voice channel
5. All participants in the voice channel can watch the video together

### Technical Details

The Discord Activity is built using:
- Vite for frontend development
- TypeScript for type safety
- Discord's Embedded App SDK for voice channel integration
- Kaltura Player for video playback
- Custom synchronization service for playback synchronization

## Development

### Project Structure

```
kaltura-discord/
├── config/
│   ├── default_config.json
│   └── overrides/
├── discord-activity/
│   ├── packages/
│   │   ├── client/
│   │   │   ├── src/
│   │   │   │   ├── discordSdk.ts
│   │   │   │   ├── kalturaPlayer.ts
│   │   │   │   ├── main.ts
│   │   │   │   ├── style.css
│   │   │   │   └── syncService.ts
│   │   │   ├── index.html
│   │   │   └── package.json
│   │   └── server/
│   │       ├── src/
│   │       │   ├── app.ts
│   │       │   └── utils.ts
│   │       └── package.json
│   ├── config.yml
│   └── package.json
├── docs/
├── logs/
├── src/
│   ├── common/
│   │   ├── envService.ts
│   │   └── logger.ts
│   ├── discord/
│   │   ├── bot.ts
│   │   ├── commandHandlers.ts
│   │   ├── commands.ts
│   │   ├── interactions.ts
│   │   └── kalturaActivity.ts
│   ├── services/
│   │   ├── apiGateway.ts
│   │   ├── configService.ts
│   │   ├── kalturaClient.ts
│   │   └── userAuthService.ts
│   └── index.ts
├── tests/
│   └── end-to-end-test.js
├── .env.example
├── cleanup-env.sh
├── deploy-dev.sh
├── deploy-prod.sh
├── package.json
├── README.md
├── simplify-env.sh
├── test-before-deploy.sh
└── tsconfig.json
```

### Development Workflow

1. Set up the environment:
   ```bash
   ./simplify-env.sh
   ```

2. Start the development server:
   ```bash
   ./deploy-dev.sh
   ```

3. Make changes to the source code

4. Test your changes:
   ```bash
   ./test-before-deploy.sh
   ```

## Testing

### Running Tests

```bash
npm test
```

### End-to-End Testing

The project includes an end-to-end test script that tests all components of the integration:

```bash
node tests/end-to-end-test.js
```

## Deployment

### Development Deployment

For local development with a Cloudflare tunnel:

```bash
./deploy-dev.sh
```

This script will:
1. Load environment variables from `.env` file
2. Set development-specific environment variables
3. Build both the main Discord bot and the Discord Activity component
4. Set up a Cloudflare tunnel to expose the local server
5. Start both servers

### Production Deployment

For production deployment to Cloudflare:

```bash
./deploy-prod.sh
```

This script will:
1. Load environment variables from `.env` file
2. Set production-specific environment variables
3. Run tests before deployment
4. Build both components with production optimizations
5. Deploy to Cloudflare using Wrangler

### Environment Management

The project uses a simplified approach to environment management:

1. A single `.env` file for both components
2. Environment-specific variables set by deployment scripts at runtime
3. Symbolic link for shared environment file between components

To simplify environment variable management:

```bash
./simplify-env.sh
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Security

For information about security practices and how to report security vulnerabilities, please read our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Troubleshooting

For detailed troubleshooting information, please refer to the [Troubleshooting Guide](docs/troubleshooting.md).

### Common Issues

#### Discord Bot Not Responding

- Check if the bot is online in Discord
- Verify that the bot token is correct in the `.env` file
- Check the logs for any errors
- Ensure that the required intents are enabled in the Discord Developer Portal

#### Kaltura API Errors

- Verify that the Kaltura Partner ID and Admin Secret are correct
- Check if the Kaltura API endpoint is accessible
- Look for specific error messages in the logs

#### Configuration Issues

- Ensure that the `config/default_config.json` file exists and is valid JSON
- Check if the `config/overrides` directory exists and is writable
- Verify that server-specific configurations are correctly formatted

#### Discord Activity Issues

- Ensure that the Discord Application ID is correct
- Verify that the Discord Activity URL is accessible
- Check if the user is in a voice channel
- Look for specific error messages in the logs

### Logs

Logs are stored in the `logs` directory:
- `logs/combined.log`: All logs
- `logs/error.log`: Error logs only

You can adjust the log level in the `.env` file:
```
LOG_LEVEL=debug  # For more detailed logs