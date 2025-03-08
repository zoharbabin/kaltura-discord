# Environment Variables Management

This document explains how environment variables are managed in the Kaltura-Discord integration project.

## Simplified Approach

We've simplified the environment variable management to use a single `.env` file for both the main Discord bot and the Discord Activity component. This makes it easier to maintain and update configuration settings.

## Environment Files

The project uses a single `.env` file with all configuration values. Environment-specific variables (like `NODE_ENV`, `DISCORD_ACTIVITY_URL`, and `PUBLIC_URL`) are set by the deployment scripts at runtime.

## Deployment Process

The deployment scripts (`deploy-dev.sh` and `deploy-prod.sh`) automatically:

1. Load variables from the `.env` file
2. Set environment-specific variables:
   - For development: `NODE_ENV=development`, `DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com`, etc.
   - For production: `NODE_ENV=production`, `DISCORD_ACTIVITY_URL=https://discord.zoharbabin.com`, etc.
3. Make these variables available to both the main Discord bot and the Discord Activity component

## Testing with Real Kaltura API vs. Mock Data

The system provides mock data when:
1. Using placeholder credentials (`your_kaltura_partner_id` or `your_kaltura_admin_secret`)
2. Running in development mode and the real API calls fail

Your current `.env` file already contains real Kaltura credentials, so the system will use those for API calls.

## Environment Variables Reference

### Discord Configuration
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord client ID
- `DISCORD_CLIENT_SECRET` - Discord client secret
- `DISCORD_APPLICATION_ID` - Discord application ID

### Kaltura API Configuration
- `KALTURA_PARTNER_ID` - Kaltura partner ID
- `KALTURA_ADMIN_SECRET` - Kaltura admin secret
- `KALTURA_API_ENDPOINT` - Kaltura API endpoint (default: https://www.kaltura.com/api_v3)
- `KALTURA_PLAYER_ID` - Kaltura player ID

### API Gateway Configuration
- `API_PORT` - Port for the API gateway (default: 3000)

### JWT Configuration
- `JWT_SECRET` - Secret for JWT token generation
- `JWT_EXPIRY` - JWT token expiry (default: 1h)

### Logging Configuration
- `LOG_LEVEL` - Logging level (default: info)

### Discord Activity Client Configuration
- `VITE_CLIENT_ID` - Same as DISCORD_CLIENT_ID
- `VITE_KALTURA_PARTNER_ID` - Same as KALTURA_PARTNER_ID
- `VITE_KALTURA_PLAYER_ID` - Same as KALTURA_PLAYER_ID
- `VITE_KALTURA_API_ENDPOINT` - Same as KALTURA_API_ENDPOINT

### Discord Activity Server Configuration
- `PORT` - Port for the Discord Activity server (default: 3001)

### Environment-Specific Variables (Set by Deployment Scripts)
- `NODE_ENV` - Node environment (development or production)
- `DISCORD_ACTIVITY_URL` - URL for the Discord Activity (dev: https://discord-dev.zoharbabin.com, prod: https://discord.zoharbabin.com)
- `PUBLIC_URL` - Public URL for the Discord Activity (dev: http://localhost:3000, prod: https://discord.zoharbabin.com)

## Setting Up Environment Files

To set up the simplified environment file structure, run the simplify-env script:

```bash
chmod +x simplify-env.sh
./simplify-env.sh
```

This script will:
1. Create a single `.env` file with all your existing values
2. Create a backup of your original `.env` file as `.env.backup`
3. Remove unnecessary environment files
4. Create a symbolic link from `discord-activity/.env` to `.env`