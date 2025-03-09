# Kaltura-Discord Integration: Video API Endpoints

This document provides detailed information about the video API endpoints implemented in the Kaltura-Discord integration.

## Overview

The Video API endpoints allow clients to search for videos, retrieve video details, and generate play URLs for videos. These endpoints are implemented in the API Gateway and provide a RESTful interface to the Kaltura video functionality.

## Authentication

All video API endpoints require authentication using a valid JWT token. The token should be included in the `Authorization` header as a Bearer token:

```
Authorization: Bearer <your_token>
```

To obtain a token, use the `/api/auth/token` endpoint with valid Discord credentials.

## Endpoints

### List Videos

Retrieves a list of all available videos.

**Endpoint:** `GET /api/videos`

**Authentication:** Required

**Response:**

```json
{
  "videos": [
    {
      "id": "1_abc123",
      "title": "Video Title",
      "description": "Video Description",
      "thumbnailUrl": "https://example.com/thumbnail.jpg",
      "duration": 300,
      "createdAt": "2025-03-01T12:00:00.000Z",
      "views": 100,
      "userId": "user@example.com",
      "playUrl": "https://example.com/play/1_abc123"
    },
    ...
  ]
}
```

### Search Videos

Searches for videos based on query parameters.

**Endpoint:** `GET /api/videos/search`

**Authentication:** Required

**Query Parameters:**

- `q` (string): Search query
- `limit` (number, optional): Maximum number of results to return (default: 10)
- `page` (number, optional): Page number for pagination (default: 1)

**Example:** `/api/videos/search?q=test&limit=5`

**Response:**

```json
{
  "videos": [
    {
      "id": "1_abc123",
      "title": "Test Video",
      "description": "This is a test video",
      "thumbnailUrl": "https://example.com/thumbnail.jpg",
      "duration": 300,
      "createdAt": "2025-03-01T12:00:00.000Z",
      "views": 100,
      "userId": "user@example.com",
      "playUrl": "https://example.com/play/1_abc123"
    },
    ...
  ]
}
```

### Get Video Details

Retrieves details for a specific video.

**Endpoint:** `GET /api/videos/:id`

**Authentication:** Required

**Parameters:**

- `id` (string): The video ID

**Example:** `/api/videos/1_abc123`

**Response:**

```json
{
  "video": {
    "id": "1_abc123",
    "title": "Video Title",
    "description": "Video Description",
    "thumbnailUrl": "https://example.com/thumbnail.jpg",
    "duration": 300,
    "createdAt": "2025-03-01T12:00:00.000Z",
    "views": 100,
    "userId": "user@example.com",
    "playUrl": "https://example.com/play/1_abc123"
  }
}
```

### Generate Play URL

Generates a play URL for a specific video.

**Endpoint:** `POST /api/videos/:id/play`

**Authentication:** Required

**Parameters:**

- `id` (string): The video ID

**Example:** `/api/videos/1_abc123/play`

**Response:**

```json
{
  "playUrl": "https://example.com/play/1_abc123?ks=abc123def456",
  "videoId": "1_abc123"
}
```

### Get Kaltura Video Details

Retrieves details for a specific Kaltura video.

**Endpoint:** `GET /api/kaltura/video/:id`

**Authentication:** Required

**Parameters:**

- `id` (string): The Kaltura video ID

**Example:** `/api/kaltura/video/1_abc123`

**Response:**

```json
{
  "video": {
    "id": "1_abc123",
    "title": "Video Title",
    "description": "Video Description",
    "thumbnailUrl": "https://example.com/thumbnail.jpg",
    "duration": 300,
    "createdAt": "2025-03-01T12:00:00.000Z",
    "views": 100,
    "userId": "user@example.com",
    "playUrl": "https://example.com/play/1_abc123"
  }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in case of failure:

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

Error responses include a JSON object with an `error` field containing a descriptive error message:

```json
{
  "error": "Failed to get video"
}
```

## Usage Examples

### Using cURL

```bash
# Get authentication token
curl -X POST "http://localhost:3000/api/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"discordId": "123456789", "username": "TestUser", "roles": ["admin"]}'

# Search for videos
curl -X GET "http://localhost:3000/api/videos/search?q=test&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get video details
curl -X GET "http://localhost:3000/api/videos/1_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate play URL
curl -X POST "http://localhost:3000/api/videos/1_abc123/play" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using JavaScript

```javascript
// Get authentication token
const authResponse = await fetch('http://localhost:3000/api/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    discordId: '123456789',
    username: 'TestUser',
    roles: ['admin']
  })
});
const authData = await authResponse.json();
const token = authData.token;

// Search for videos
const searchResponse = await fetch('http://localhost:3000/api/videos/search?q=test&limit=5', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const searchData = await searchResponse.json();
const videos = searchData.videos;

// Get video details
const videoResponse = await fetch(`http://localhost:3000/api/videos/${videoId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const videoData = await videoResponse.json();
const video = videoData.video;

// Generate play URL
const playResponse = await fetch(`http://localhost:3000/api/videos/${videoId}/play`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const playData = await playResponse.json();
const playUrl = playData.playUrl;
```

## Integration with Discord Bot

The Discord bot can use these endpoints to search for videos, display video details, and generate play URLs for users. This enables features like:

1. Searching for videos directly from Discord
2. Displaying video details in Discord messages
3. Generating play URLs for users to watch videos
4. Launching Discord Activities for watching videos together

## Testing

You can test these endpoints using the `local-api-test.sh` script provided in the project:

```bash
./local-api-test.sh
```

This script will test all API endpoints, including the video endpoints, and display the results.