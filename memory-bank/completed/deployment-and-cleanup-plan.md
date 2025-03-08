# Deployment and Cleanup Plan for Kaltura-Discord Integration

## Overview

This document outlines the plan for cleaning up the codebase and implementing deployment scripts for both development and production environments for the Kaltura-Discord integration project. The plan addresses redundant files, code clarity, and automated deployment processes.

## 1. Codebase Cleanup

### 1.1 File Structure Analysis

The project consists of two main components:
1. **Main Discord Bot** (root directory): Handles Discord bot commands and interactions
2. **Discord Activity** (discord-activity directory): Implements the Watch Together feature using Discord's Activities API

### 1.2 Redundant Files Identification

Based on the codebase review, the following files may be redundant or need consolidation:

1. **Mock implementations**: Replace mock endpoints in `discord-activity/packages/server/src/app.ts` with real API calls
2. **Duplicate environment configurations**: Consolidate environment variable management between main project and Discord Activity
3. **Unused test files**: Remove any unused test files or stubs

### 1.3 Code Clarity Improvements

1. **Documentation**: Add JSDoc comments to all functions and classes
2. **Error handling**: Standardize error handling across the codebase
3. **Logging**: Implement consistent logging patterns (remove debug logs in production)
4. **Type definitions**: Ensure proper TypeScript types throughout the codebase

## 2. Development Environment Setup

### 2.1 Development Deployment Script

Create a script (`deploy-dev.sh`) that will:

1. Build both the main Discord bot and Discord Activity components
2. Configure environment variables for development
3. Start a local Node.js server
4. Set up a Cloudflare tunnel to expose the local server at `https://discord-dev.zoharbabin.com`

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

### 2.2 Development Environment Configuration

Create a `.env.development` file with appropriate configuration:

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
```

## 3. Production Environment Setup

### 3.1 Production Deployment Script

Create a script (`deploy-prod.sh`) that will:

1. Build both the main Discord bot and Discord Activity components with production optimizations
2. Configure environment variables for production
3. Deploy the Discord Activity to Cloudflare using Wrangler
4. Set up proper routing for `https://discord.zoharbabin.com`

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

### 3.2 Production Environment Configuration

Create a `.env.production` file with appropriate configuration:

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

### 3.3 Cloudflare Configuration

Create a `wrangler.toml` file in the Discord Activity directory:

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

## 4. Automated Testing

### 4.1 Pre-deployment Testing Script

Create a script (`test-before-deploy.sh`) that will:

1. Run unit tests for both components
2. Perform end-to-end tests
3. Check for TypeScript errors
4. Run ESLint to ensure code quality

```bash
#!/bin/bash
# test-before-deploy.sh - Pre-deployment testing script

# Run tests for main Discord bot
echo "Running tests for main Discord bot..."
npm run test

# Run ESLint
echo "Running ESLint..."
npm run lint

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
npm run build -- --noEmit

# Run end-to-end tests
echo "Running end-to-end tests..."
npm run test:e2e

# If any command fails, exit with error
if [ $? -ne 0 ]; then
  echo "Tests failed! Aborting deployment."
  exit 1
fi

echo "All tests passed! Ready for deployment."
```

## 5. Implementation Plan

### 5.1 Immediate Actions

1. Create the deployment scripts (`deploy-dev.sh` and `deploy-prod.sh`)
2. Set up environment configuration files (`.env.development` and `.env.production`)
3. Create the Cloudflare configuration (`wrangler.toml`)
4. Implement the pre-deployment testing script (`test-before-deploy.sh`)

### 5.2 Code Cleanup Tasks

1. Replace mock endpoints with real API calls in the Discord Activity server
2. Standardize error handling and logging across the codebase
3. Add comprehensive JSDoc comments to all functions and classes
4. Remove redundant files and consolidate duplicate code

### 5.3 Testing and Validation

1. Test the development deployment script with a local environment
2. Validate the Cloudflare tunnel setup for the development environment
3. Test the production deployment script with a staging environment
4. Verify that the Discord Activity works correctly in both environments

## 6. Maintenance Considerations

### 6.1 Monitoring

1. Set up logging to monitor application performance and errors
2. Implement health check endpoints for both components
3. Configure alerts for critical errors or performance issues

### 6.2 Updates and Versioning

1. Implement semantic versioning for both components
2. Document the update process for future releases
3. Create a rollback strategy for failed deployments

### 6.3 Security

1. Regularly rotate API keys and secrets
2. Implement rate limiting for API endpoints
3. Perform regular security audits of the codebase

## 7. Documentation

### 7.1 Deployment Documentation

1. Create detailed deployment guides for both development and production environments
2. Document the environment configuration process
3. Provide troubleshooting steps for common deployment issues

### 7.2 Developer Documentation

1. Update code documentation with the new deployment process
2. Document the architecture and component interactions
3. Create onboarding guides for new developers

## Conclusion

This plan provides a comprehensive approach to cleaning up the codebase and implementing automated deployment scripts for both development and production environments. By following this plan, the Kaltura-Discord integration will be more maintainable, easier to deploy, and better secured through proper environment configuration and Cloudflare integration.