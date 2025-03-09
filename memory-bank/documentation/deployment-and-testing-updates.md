# Deployment and Testing Script Updates

This document outlines the updates made to the deployment and testing scripts to support the new features implemented in Weeks 1-4:

1. API Client and Core Services
2. User Presence Framework
3. Synchronization and Network Quality
4. Testing and Optimization

## API Gateway Updates

We've enhanced the API Gateway with new endpoints to support user presence and synchronization features, and consolidated the video endpoints for better organization:

### Health Endpoints
- `/api/health` - General API health check
- `/api/gateway/health` - API Gateway specific health check with version information

### Video Endpoints (Consolidated)
- `GET /api/videos` - Get all videos
- `GET /api/videos/search` - Search for videos
- `GET /api/videos/:id` - Get video details by ID
- `POST /api/videos/:id/play` - Generate a play URL for a video

### User Presence Endpoints
- `GET /api/presence/users` - Get all user presences
- `POST /api/presence/update` - Update a user's presence status
- `POST /api/presence/network` - Update a user's network quality

### Synchronization Endpoints
- `POST /api/sync/request` - Request synchronization from the host
- `POST /api/sync/broadcast` - Broadcast playback state to all participants
- `GET /api/sync/metrics` - Get synchronization metrics

These endpoints provide the backend support for the user presence framework and synchronization features implemented in the client.

## Script Updates

### setup-and-test.sh

The setup script has been enhanced to:

- Check for new required environment variables:
  - `API_GATEWAY_URL`: URL for the API Gateway service
  - `ENABLE_API_GATEWAY`: Flag to enable/disable API Gateway integration

- Validate the presence of user presence components:
  - UserPresence interface in `types/userPresence.ts`
  - NetworkQuality type for network condition monitoring
  - SyncMetrics type for synchronization performance tracking

- Check for UI components:
  - NetworkIndicator component for displaying network quality
  - UserPresenceDisplay component for showing user presence information

- Verify API client implementation:
  - API client service in `services/apiClient.ts`
  - Integration with KalturaService

- Add Discord App Activity URL Mapping instructions:
  - Guide users to add required domains to their Discord Developer Portal
  - Explain the importance of URL mappings for Discord Activity functionality
  - Provide step-by-step instructions with direct links to the Discord Developer Portal

### test-before-deploy.sh

The pre-deployment test script has been updated to:

- Add new required environment variables to validation:
  - `API_GATEWAY_URL`
  - `ENABLE_API_GATEWAY`

- Add comprehensive checks for user presence components:
  - UserPresence interface
  - NetworkQuality and SyncMetrics types
  - UI components (NetworkIndicator, UserPresenceDisplay)

- Add API Gateway integration validation:
  - API client implementation
  - KalturaService integration with API Gateway

### deploy-dev.sh

The development deployment script has been enhanced to:

- Set development-specific environment variables:
  - `API_GATEWAY_URL=https://discord-dev.zoharbabin.com/api`
  - `ENABLE_API_GATEWAY=true`
  - `PUBLIC_URL=https://discord-dev.zoharbabin.com`

- Use Cloudflare tunnel for all URLs:
  - Ensure consistent domain usage across all services
  - Avoid using localhost for better Discord integration

- Pass API Gateway configuration to Discord Activity server:
  - Include environment variables in server startup command

### deploy-prod.sh

The production deployment script has been updated to:

- Set production-specific environment variables:
  - `API_GATEWAY_URL=https://api.zoharbabin.com`
  - `ENABLE_API_GATEWAY=true`

- Update Wrangler configuration:
  - Add API Gateway variables to Cloudflare Workers environment

### local-api-test.sh

The local API testing script has been enhanced to:

- Add API Gateway endpoint tests:
  - Test API Gateway health endpoint

- Update video endpoint tests to use consolidated routes:
  - Use `/api/videos/:id` instead of `/api/kaltura/video/:id`
  - Test all video-related endpoints through the unified API

- Add user presence feature tests:
  - Get all user presences
  - Update network quality
  - Request synchronization

## Usage Instructions

### Setting Up the Environment

1. Run the setup script to configure your environment:
   ```bash
   ./setup-and-test.sh
   ```

2. Ensure the following environment variables are set in your `.env` file:
   ```
   API_GATEWAY_URL=https://discord-dev.zoharbabin.com/api
   ENABLE_API_GATEWAY=true
   ```

3. Configure Discord App Activity URL Mapping:
   - Go to your Discord Developer Portal: https://discord.com/developers/applications
   - Select your application
   - Navigate to "Embedded" > "URL Mappings"
   - Add the following URL mappings:
     - `discord-dev.zoharbabin.com` (for development)
     - `discord.zoharbabin.com` (for production)
   - Save your changes

### Testing Before Deployment

1. Run the pre-deployment test script to validate your changes:
   ```bash
   ./test-before-deploy.sh
   ```

2. Address any issues reported by the script before proceeding with deployment.

### Deploying to Development

1. Deploy to the development environment:
   ```bash
   ./deploy-dev.sh
   ```

2. The script will set up the necessary environment variables and start both the main server and Discord Activity server.

### Deploying to Production

1. Deploy to the production environment:
   ```bash
   ./deploy-prod.sh
   ```

2. The script will build the application with production settings and deploy to Cloudflare Workers.

### Testing API Endpoints

1. Test the API endpoints locally:
   ```bash
   ./local-api-test.sh
   ```

2. The script will test all endpoints, including the new API Gateway and user presence features.

## Troubleshooting

### API Gateway Issues

If you encounter issues with the API Gateway:

1. Verify that the `API_GATEWAY_URL` environment variable is correctly set.
2. Check that the API Gateway service is running and accessible.
3. Ensure that the `ENABLE_API_GATEWAY` flag is set to `true`.

### User Presence Issues

If user presence features are not working:

1. Verify that the UserPresence interface and related components are properly implemented.
2. Check that the Discord SDK wrapper is correctly integrated with the user presence system.
3. Ensure that the synchronization service is properly initialized and running.

### Discord Activity URL Mapping Issues

If Discord Activity is not loading properly:

1. Verify that you've added the correct URL mappings in the Discord Developer Portal.
2. Ensure that both development and production URLs are mapped:
   - `discord-dev.zoharbabin.com`
   - `discord.zoharbabin.com`
3. Check that your Cloudflare tunnel is properly configured and running.
4. Verify that the domains resolve correctly by using `ping` or `nslookup`.
5. Check browser console for any CORS or security-related errors.

### Deployment Issues

If deployment fails:

1. Run the `test-before-deploy.sh` script to identify any issues.
2. Check the logs for specific error messages.
3. Verify that all required environment variables are correctly set.
4. Ensure that the Cloudflare authentication is properly configured for production deployments.