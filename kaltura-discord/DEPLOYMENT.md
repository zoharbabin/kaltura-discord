# Kaltura-Discord Integration Deployment Guide

This document provides instructions for deploying the Kaltura-Discord integration in both development and production environments.

## Prerequisites

Before deploying, ensure you have the following:

1. **Node.js 18+** installed
2. **pnpm** installed (`npm install -g pnpm`)
3. **Cloudflare account** with access to the Cloudflare Workers service
4. **Cloudflared CLI** installed for development tunneling
5. **Wrangler CLI** installed for Cloudflare deployment (`npm install -g wrangler`)
6. **Discord bot token** and application credentials
7. **Kaltura API credentials** (partner ID, admin secret)

## Environment Configuration

The application uses a single `.env` file for both development and production environments. The deployment scripts automatically set additional environment-specific variables at runtime.

- `.env` - Main environment configuration file
- Symbolic link from `discord-activity/.env` to the main `.env` file

Make sure to update the `.env` file with your actual credentials before deployment. You can use the provided `.env.example` file as a template.

## Deployment Scripts

### Development Deployment

The `deploy-dev.sh` script deploys the application in development mode with a Cloudflare tunnel:

```bash
# Make the script executable
chmod +x deploy-dev.sh

# Run the development deployment
./deploy-dev.sh
```

This script will:
1. Load environment variables from `.env` file
2. Set development-specific environment variables
3. Build the main Discord bot
4. Build the Discord Activity component
5. Start a local Node.js server
6. Set up a Cloudflare tunnel to expose the local server at `https://discord-dev.zoharbabin.com`

### Production Deployment

The `deploy-prod.sh` script deploys the application to Cloudflare for production:

```bash
# Make the script executable
chmod +x deploy-prod.sh

# Run the production deployment
./deploy-prod.sh
```

This script will:
1. Load environment variables from `.env` file
2. Set production-specific environment variables
3. Run tests to ensure code quality
4. Build the main Discord bot
5. Build the Discord Activity component with production optimizations
6. Deploy the Discord Activity to Cloudflare using Wrangler

### Pre-Deployment Testing

The `test-before-deploy.sh` script runs tests before deployment:

```bash
# Make the script executable
chmod +x test-before-deploy.sh

# Run the tests
./test-before-deploy.sh
```

This script will:
1. Run unit tests for the main Discord bot
2. Run ESLint to check code quality
3. Check TypeScript compilation
4. Run end-to-end tests
5. Check for security vulnerabilities
6. Check for outdated packages

## Cloudflare Configuration

The Discord Activity is deployed to Cloudflare using Wrangler. The configuration is in `discord-activity/wrangler.toml`.

Make sure to update the following values in the `wrangler.toml` file:
- `account_id` - Your Cloudflare account ID
- `zone_id` - Your Cloudflare zone ID for the domain

### Setting Secrets in Cloudflare

Sensitive information should be stored as secrets in Cloudflare:

```bash
# Set Discord client secret
wrangler secret put CLIENT_SECRET

# Set Kaltura admin secret
wrangler secret put KALTURA_ADMIN_SECRET

# Set JWT secret
wrangler secret put JWT_SECRET
```

## URL Configuration

The application uses the following URLs:

- Development: `https://discord-dev.zoharbabin.com`
- Production: `https://discord.zoharbabin.com`

Make sure these domains are properly configured in your Cloudflare account and point to the correct workers.

## Discord Bot Configuration

After deployment, you need to configure your Discord bot:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "Bot" in the sidebar
4. Enable the necessary Privileged Gateway Intents
5. Go to "OAuth2" > "URL Generator"
6. Select the required scopes and permissions
7. Use the generated URL to add the bot to your Discord server

## Troubleshooting

### Cloudflare Tunnel Issues

If you encounter issues with the Cloudflare tunnel:

1. Check if `cloudflared` is running: `ps aux | grep cloudflared`
2. Verify tunnel status: `cloudflared tunnel info discord-tunnel`
3. Check tunnel logs: `cloudflared tunnel route list`

### Deployment Failures

If deployment fails:

1. Check the logs for error messages
2. Verify that all environment variables are correctly set
3. Ensure you have the necessary permissions in Cloudflare
4. Check that the Wrangler configuration is correct

### Discord Bot Connection Issues

If the Discord bot fails to connect:

1. Verify that the bot token is correct
2. Check that the bot has been added to your Discord server
3. Ensure the bot has the necessary permissions
4. Check the application logs for connection errors

## Monitoring

After deployment, monitor the application using:

1. Cloudflare Workers analytics
2. Application logs
3. Discord bot status

## Rollback Procedure

If you need to rollback to a previous version:

1. For Cloudflare Workers, use Wrangler to deploy the previous version:
   ```bash
   wrangler rollback
   ```

2. For the Discord bot, stop the current process and start the previous version.