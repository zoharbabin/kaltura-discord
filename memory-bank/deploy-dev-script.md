# Development Deployment Script

This file contains the script for deploying the application in development mode. Copy this content to a file named `deploy-dev.sh` in the project root and make it executable with `chmod +x deploy-dev.sh`.

```bash
#!/bin/bash
# deploy-dev.sh - Development deployment script

# Load environment variables
source .env.development

# Build main Discord bot
echo "Building main Discord bot..."
npm run build

# Build Discord Activity
echo "Building Discord Activity..."
cd discord-activity
pnpm run build:dev
cd ..

# Start the server with development configuration
echo "Starting development server..."
NODE_ENV=development npm run start &
SERVER_PID=$!

# Set up Cloudflare tunnel
echo "Setting up Cloudflare tunnel to discord-dev.zoharbabin.com..."
cd discord-activity
pnpm run tunnel:run

# Cleanup function
function cleanup {
  echo "Stopping server..."
  kill $SERVER_PID
  exit
}

# Register cleanup function on script exit
trap cleanup EXIT
```

## Usage

1. Create a `.env.development` file with the appropriate configuration
2. Run the script: `./deploy-dev.sh`
3. The application will be available at `https://discord-dev.zoharbabin.com`

## Environment Configuration

Create a `.env.development` file with the following content:

```
# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Kaltura API Configuration
KALTURA_PARTNER_ID=your_kaltura_partner_id
KALTURA_ADMIN_SECRET=your_kaltura_admin_secret
KALTURA_API_ENDPOINT=https://www.kaltura.com/api_v3
KALTURA_PLAYER_ID=your_kaltura_player_id

# API Gateway Configuration
API_PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1h

# Discord Activity Configuration
DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com