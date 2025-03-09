# Real API Integration Implementation Plan

## Overview

This document outlines the implementation plan for replacing mock endpoints in the Discord Activity server with real API calls to the Kaltura-Discord integration's API Gateway. This integration will provide a more robust and reliable experience for users watching Kaltura videos together in Discord voice channels.

## Current Mock Implementation Analysis

The current Discord Activity server uses mock data in several key areas:

1. **Video Details Retrieval**: Mock video objects are returned when real Kaltura API credentials are not available.
2. **Kaltura Session Generation**: Mock KS tokens are generated for development/testing.
3. **Video Search and Listing**: Mock video lists are returned when searching or listing videos.

## Implementation Steps

### 1. Create API Client Service

Create a dedicated API client service to handle communication with the Kaltura-Discord API Gateway:

- Implement a reusable `ApiClient` class with methods for GET and POST requests
- Add authentication token management
- Implement error handling and logging
- Create a singleton instance configured with the API Gateway URL

### 2. Update Environment Configuration

Add the necessary environment variables to support the API Gateway integration:

```
# .env.example additions
API_GATEWAY_URL=http://localhost:3000/api
API_GATEWAY_TOKEN=your_api_gateway_token
ENABLE_DIRECT_KALTURA=false
```

Update the environment.d.ts file to include the new environment variables.

### 3. Update KalturaService to Use API Gateway

Refactor the KalturaService to use the API Gateway endpoints instead of direct Kaltura API calls:

- Implement authentication with the API Gateway
- Update session generation to use the API Gateway
- Update video details retrieval to use the API Gateway
- Update video search and listing to use the API Gateway
- Add a new method for generating play URLs
- Maintain fallback to direct Kaltura API calls when needed
- Keep development fallbacks for local testing

### 4. Update Server-Side App.ts

Update the server-side app.ts to use the new KalturaService implementation:

- Initialize the API client with the API Gateway URL
- Initialize the KalturaService with the API client
- Update the token handler to authenticate with the API Gateway
- Update the session handler to use the KalturaService
- Update the video handler to use the KalturaService
- Update the search and list handlers to use the KalturaService

### 5. Update Client-Side Integration

Update the client-side code to work with the new API integration:

- Update the authentication flow to handle API Gateway tokens
- Update video loading to use the new API endpoints
- Update error handling to account for API Gateway errors

### 6. Implement Graceful Fallbacks

Implement graceful fallbacks for when the API Gateway is unavailable:

- Maintain development fallbacks for local testing
- Add retry logic for API calls
- Implement circuit breaker pattern for API Gateway failures
- Provide clear error messages to users

## API Gateway Endpoints to Integrate

The following API Gateway endpoints will be integrated:

1. **Authentication**:
   - `POST /api/auth/token` - Obtain an API token

2. **Video Operations**:
   - `GET /api/videos` - List all videos
   - `GET /api/videos/search` - Search for videos
   - `GET /api/videos/:id` - Get video details
   - `POST /api/videos/:id/play` - Generate a play URL
   - `GET /api/kaltura/video/:id` - Get Kaltura video details

3. **Session Management**:
   - `POST /api/videos/:id/session` - Generate a Kaltura session for a video

## Error Handling Strategy

Implement a comprehensive error handling strategy:

1. **API Client Errors**:
   - Log detailed error information
   - Implement retry logic for transient errors
   - Return meaningful error messages

2. **Authentication Errors**:
   - Handle token expiration
   - Implement automatic token refresh
   - Provide clear feedback on authentication failures

3. **Video API Errors**:
   - Graceful fallbacks to mock data in development
   - Clear error messages for production
   - Retry logic for transient errors

4. **Network Errors**:
   - Handle timeouts and connection issues
   - Implement exponential backoff for retries
   - Provide offline mode for development

## Testing Strategy

1. **Unit Testing**:
   - Test API client with mocked responses
   - Test KalturaService with mocked API client
   - Test error handling and fallbacks

2. **Integration Testing**:
   - Test with real API Gateway in development environment
   - Test fallback mechanisms
   - Test error scenarios

3. **End-to-End Testing**:
   - Test the complete flow from Discord Activity to API Gateway
   - Test with various network conditions
   - Test with different video types and sizes

## Implementation Phases

### Phase 1: Core API Client and Service Updates

1. Create the API client service
2. Update environment configuration
3. Update KalturaService to use API Gateway
4. Implement basic error handling

### Phase 2: Server-Side Integration

1. Update app.ts to use the new KalturaService
2. Update token handler for API Gateway authentication
3. Update video handlers to use the KalturaService
4. Implement graceful fallbacks

### Phase 3: Client-Side Integration

1. Update authentication flow
2. Update video loading
3. Enhance error handling
4. Improve user feedback

### Phase 4: Testing and Refinement

1. Comprehensive testing
2. Performance optimization
3. Error handling improvements
4. Documentation updates

## Conclusion

This implementation plan provides a structured approach to replacing mock endpoints with real API calls in the Discord Activity server. By leveraging the Kaltura-Discord API Gateway, we can provide a more robust and reliable experience for users watching videos together in Discord voice channels, while maintaining development fallbacks for local testing and graceful degradation for production issues.
