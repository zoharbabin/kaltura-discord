# Kaltura-Discord Integration

A seamless integration between Kaltura's meeting products (Webinar, Interactive Meeting Room, Virtual Classroom) and Discord, allowing users to launch, join, and interact with Kaltura meetings directly from Discord without additional installations.

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
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Troubleshooting](#troubleshooting)

## Overview

The Kaltura-Discord integration bridges the gap between Discord's community-focused platform and Kaltura's professional virtual meeting solutions. This integration enables educational institutions, businesses, and communities to leverage both platforms' strengths:

- **Discord**: Community building, persistent chat, voice channels, and social engagement
- **Kaltura**: Enterprise-grade virtual classrooms, webinars, and interactive meeting rooms

By integrating these platforms, we create a seamless experience that eliminates friction between community engagement and structured virtual events.

## Features

- **Discord Bot Integration**: Launch, join, and manage Kaltura meetings directly from Discord
- **Automatic Authentication**: Discord identity is used to authenticate with Kaltura automatically
- **Role-Based Access**: Discord roles determine Kaltura permissions without manual configuration
- **Server-Specific Configuration**: Each Discord server can have its own configuration
- **Secure Link Generation**: Generate secure meeting join links with appropriate permissions
- **API Gateway**: RESTful API for integration with other services

## Architecture

The integration is built using a microservices architecture with the following components:

1. **Discord Bot Service**: Handles Discord interactions and commands
2. **API Gateway**: Routes requests and manages authentication
3. **Kaltura Integration Service**: Interfaces with Kaltura APIs
4. **User Authentication Service**: Manages identity mapping and token generation
5. **Configuration Service**: Manages server-specific configurations

## Prerequisites

- Node.js v18 or higher
- npm v8 or higher
- Discord Bot Token and Client ID (from [Discord Developer Portal](https://discord.com/developers/applications))
- Kaltura Partner ID and Admin Secret (from Kaltura Management Console)

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
   # Discord Bot Configuration
   DISCORD_BOT_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   
   # Kaltura API Configuration
   KALTURA_PARTNER_ID=your_kaltura_partner_id
   KALTURA_ADMIN_SECRET=your_kaltura_admin_secret
   KALTURA_API_ENDPOINT=https://www.kaltura.com/api_v3
   
   # API Gateway Configuration
   API_PORT=3000
   NODE_ENV=development
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRY=1h
   
   # Logging Configuration
   LOG_LEVEL=info
   ```

5. Build the project:
   ```bash
   npm run build
   ```

6. Create necessary directories:
   ```bash
   mkdir -p logs
   mkdir -p config/overrides
   ```

7. Run the setup and test script:
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
      "kaltura-start": ["@everyone"],
      "kaltura-join": ["@everyone"],
      "kaltura-list": ["@everyone"],
      "kaltura-end": ["@everyone"],
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
    "user_sync": true
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
npm run dev
```

For production:
```bash
npm start
```

## Discord Commands

The integration provides the following Discord slash commands:

### Meeting Management

- `/kaltura-start`: Start a new Kaltura meeting
  - Options:
    - `type`: Type of meeting (webinar, meeting, classroom)
    - `title`: Title of the meeting
    - `description`: Optional description of the meeting

- `/kaltura-join`: Join an existing Kaltura meeting
  - Options:
    - `meeting-id`: ID of the meeting to join

- `/kaltura-list`: List all active Kaltura meetings for this server

- `/kaltura-end`: End a Kaltura meeting
  - Options:
    - `meeting-id`: ID of the meeting to end

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

### Meeting Endpoints

#### List Meetings

```
GET /api/meetings
```

Response:
```json
{
  "meetings": [
    {
      "id": "meeting_id",
      "title": "Meeting Title",
      "description": "Meeting Description",
      "type": "webinar",
      "status": "active",
      "ownerId": "discord_123456789",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "joinUrl": "https://kaltura.com/join/meeting_id"
    }
  ]
}
```

#### Get Meeting

```
GET /api/meetings/:id
```

Response:
```json
{
  "meeting": {
    "id": "meeting_id",
    "title": "Meeting Title",
    "description": "Meeting Description",
    "type": "webinar",
    "status": "active",
    "ownerId": "discord_123456789",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "joinUrl": "https://kaltura.com/join/meeting_id"
  }
}
```

#### Create Meeting

```
POST /api/meetings
```

Request body:
```json
{
  "title": "Meeting Title",
  "description": "Meeting Description",
  "type": "webinar"
}
```

Response:
```json
{
  "meeting": {
    "id": "meeting_id",
    "title": "Meeting Title",
    "description": "Meeting Description",
    "type": "webinar",
    "status": "active",
    "ownerId": "discord_123456789",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "joinUrl": "https://kaltura.com/join/meeting_id"
  },
  "joinUrl": "https://kaltura.com/join/meeting_id?token=jwt_token"
}
```

#### End Meeting

```
DELETE /api/meetings/:id
```

Response:
```json
{
  "success": true,
  "message": "Meeting ended successfully"
}
```

#### Generate Join URL

```
POST /api/meetings/:id/join
```

Response:
```json
{
  "joinUrl": "https://kaltura.com/join/meeting_id?token=jwt_token",
  "meeting": {
    "id": "meeting_id",
    "title": "Meeting Title",
    "description": "Meeting Description",
    "type": "webinar",
    "status": "active",
    "ownerId": "discord_123456789",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "joinUrl": "https://kaltura.com/join/meeting_id"
  }
}
```

## Development

### Project Structure

```
kaltura-discord/
├── config/
│   ├── default_config.json
│   └── overrides/
├── docs/
├── logs/
├── src/
│   ├── common/
│   │   └── logger.ts
│   ├── discord/
│   │   ├── bot.ts
│   │   ├── commandHandlers.ts
│   │   ├── commands.ts
│   │   └── interactions.ts
│   ├── services/
│   │   ├── apiGateway.ts
│   │   ├── configService.ts
│   │   ├── kalturaClient.ts
│   │   └── userAuthService.ts
│   └── index.ts
├── tests/
│   └── end-to-end-test.js
├── .dockerignore
├── .env.example
├── .eslintrc.json
├── .gitignore
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── Dockerfile
├── jest.config.js
├── LICENSE
├── package.json
├── README.md
├── SECURITY.md
├── setup-and-test.sh
└── tsconfig.json
```

### Development Workflow

1. Make changes to the source code
2. Run linting: `npm run lint`
3. Run tests: `npm test`
4. Build the project: `npm run build`
5. Start the development server: `npm run dev`

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

### Prerequisites

- Node.js v18 or higher
- npm v8 or higher
- Discord Bot Token and Client ID
- Kaltura Partner ID and Admin Secret

### Deployment Steps

1. Clone the repository on your server
2. Install dependencies: `npm install --production`
3. Create a `.env` file with your production credentials
4. Build the project: `npm run build`
5. Start the application: `npm start`

### Docker Deployment

A Dockerfile is provided for containerized deployment:

```bash
docker build -t kaltura-discord .
docker run -p 3000:3000 --env-file .env kaltura-discord
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

### Logs

Logs are stored in the `logs` directory:
- `logs/combined.log`: All logs
- `logs/error.log`: Error logs only

You can adjust the log level in the `.env` file:
```
LOG_LEVEL=debug  # For more detailed logs