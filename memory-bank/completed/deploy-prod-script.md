# Production Deployment Script

This file contains the script for deploying the application in production mode. Copy this content to a file named `deploy-prod.sh` in the project root and make it executable with `chmod +x deploy-prod.sh`.

```bash
#!/bin/bash
# deploy-prod.sh - Production deployment script

# Load environment variables
source .env.production

# Build main Discord bot
echo "Building main Discord bot..."
npm run build

# Build Discord Activity for production
echo "Building Discord Activity for production..."
cd discord-activity
pnpm run build:prod
cd ..

# Deploy to Cloudflare using Wrangler
echo "Deploying to Cloudflare..."
cd discord-activity
npx wrangler publish
cd ..

echo "Deployment complete! The application is now available at https://discord.zoharbabin.com"
```

## Usage

1. Create a `.env.production` file with the appropriate configuration
2. Create a `wrangler.toml` file in the Discord Activity directory
3. Run the script: `./deploy-prod.sh`
4. The application will be available at `https://discord.zoharbabin.com`

## Environment Configuration

Create a `.env.production` file with the following content:

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
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1h

# Discord Activity Configuration
DISCORD_ACTIVITY_URL=https://discord.zoharbabin.com
```

## Cloudflare Configuration

Create a `wrangler.toml` file in the Discord Activity directory with the following content:

```toml
name = "discord-activity"
type = "webpack"
account_id = "your-account-id"
workers_dev = true
route = "discord.zoharbabin.com/*"
zone_id = "your-zone-id"

[site]
bucket = "./packages/client/dist"
entry-point = "workers-site"
```

Replace `your-account-id` and `your-zone-id` with your actual Cloudflare account ID and zone ID.