# Kaltura-Discord Integration Quick Start Guide

This guide provides the essential steps to get the Kaltura-Discord integration up and running quickly.

## Prerequisites

- Node.js v18 or higher
- npm v8 or higher
- Discord Bot Token and Client ID (from [Discord Developer Portal](https://discord.com/developers/applications))
- Kaltura Partner ID and Admin Secret (from Kaltura Management Console)

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/kaltura-discord.git
cd kaltura-discord
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

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

4. **Build the project**

```bash
npm run build
```

5. **Create necessary directories**

```bash
mkdir -p logs
mkdir -p config/overrides
```

6. **Run the setup script**

```bash
chmod +x setup-and-test.sh
./setup-and-test.sh
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Adding the Bot to Your Discord Server

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

## Using the Bot

Once the bot is added to your Discord server, you can use the following slash commands:

- `/kaltura-start`: Start a new Kaltura meeting
- `/kaltura-join`: Join an existing Kaltura meeting
- `/kaltura-list`: List all active Kaltura meetings
- `/kaltura-end`: End a Kaltura meeting
- `/kaltura-config-view`: View the current configuration
- `/kaltura-config-update`: Update a configuration setting
- `/kaltura-config-reset`: Reset configuration to defaults

## Development Mode vs. Production Mode

### Development Mode

- Uses mock responses for Kaltura API calls
- Does not require actual Kaltura API credentials
- Discord bot runs without connecting to Discord API
- Suitable for development and initial testing

### Production Mode

- Connects to actual Kaltura API
- Requires valid Kaltura API credentials
- Discord bot connects to Discord API
- Requires Discord bot token and client ID
- Suitable for final testing and production

## Testing

Run the end-to-end test script:

```bash
node tests/end-to-end-test.js
```

## Next Steps

- Read the full [README.md](../README.md) for detailed information
- Check the [status-report.md](status-report.md) for current project status
- Review the [testing-summary.md](testing-summary.md) for testing details