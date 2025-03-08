# Testing Guide for Kaltura-Discord Integration

This document provides instructions for testing the Kaltura-Discord integration after deployment.

## Prerequisites

Before testing, ensure that:

1. The deployment script has been run successfully
2. The Discord bot is online and connected to your Discord server
3. The Cloudflare tunnel is running (for development environment)
4. You have the necessary permissions in the Discord server

## Testing the Discord Bot

### 1. Basic Bot Functionality

1. **Check Bot Status**:
   - Verify that the bot is online in your Discord server
   - Check the bot's status in the Discord server member list

2. **Test Slash Commands**:
   - Type `/kaltura-help` to see available commands
   - Verify that the bot responds with a list of commands

### 2. Kaltura Integration Commands

1. **Search for Videos**:
   - Type `/kaltura-search` followed by a search term
   - Verify that the bot returns a list of videos matching your search

2. **Share a Video**:
   - Type `/kaltura-share` followed by a video ID
   - Verify that the bot posts an embed with the video details and action buttons

3. **Configuration Commands** (Admin only):
   - Type `/kaltura-config-view` to view the current configuration
   - Type `/kaltura-config-update` to update a configuration value
   - Verify that the configuration changes are applied correctly

## Testing the Discord Activity

### 1. Access the Discord Activity

1. **Through Discord Bot**:
   - Use the `/kaltura-share` command to share a video
   - Click on the "Watch Together" button in the response
   - Verify that you're redirected to the Discord Activity

2. **Direct Access** (Development):
   - Open `https://discord-dev.zoharbabin.com` in your browser
   - Verify that the Discord Activity loads correctly

### 2. Test Video Playback

1. **Load a Video**:
   - Enter a valid Kaltura video ID
   - Click "Load Video"
   - Verify that the video loads and plays correctly

2. **Test Playback Controls**:
   - Play and pause the video
   - Seek to different positions in the video
   - Verify that the controls work as expected

### 3. Test Synchronization

1. **Host a Watch Party**:
   - Join a Discord voice channel
   - Share a video using the `/kaltura-share` command
   - Click "Watch Together" to start a watch party
   - Verify that you're designated as the host

2. **Join a Watch Party**:
   - Have another user join the same voice channel
   - Verify that they can see the same video
   - Verify that playback is synchronized between users

3. **Test Host Controls**:
   - As the host, play and pause the video
   - Seek to different positions
   - Verify that these actions are synchronized to other viewers

## Testing API Endpoints

### 1. Health Check

```bash
curl https://discord-dev.zoharbabin.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2025-03-08T17:00:00.000Z"
}
```

### 2. Kaltura Session Generation

```bash
curl -X POST https://discord-dev.zoharbabin.com/api/kaltura/session \
  -H "Content-Type: application/json" \
  -d '{"videoId": "your_video_id", "userId": "your_user_id"}'
```

Expected response:
```json
{
  "ks": "kaltura_session_string"
}
```

### 3. Video Details

```bash
curl https://discord-dev.zoharbabin.com/api/kaltura/video/your_video_id
```

Expected response:
```json
{
  "id": "your_video_id",
  "title": "Video Title",
  "description": "Video Description",
  "duration": 120,
  "thumbnailUrl": "https://example.com/thumbnail.jpg",
  "partnerId": "your_partner_id",
  "createdAt": "2025-03-08T17:00:00.000Z",
  "views": 100
}
```

## Troubleshooting

### Discord Bot Issues

1. **Bot Not Responding**:
   - Check the console logs for any errors
   - Verify that the bot token is correct
   - Ensure the bot has the necessary permissions

2. **Command Registration Issues**:
   - Check if commands are registered using `/kaltura-help`
   - If commands are missing, try restarting the bot
   - Check the console logs for command registration errors

### Discord Activity Issues

1. **Activity Not Loading**:
   - Check if the Cloudflare tunnel is running
   - Verify that the domain is correctly configured
   - Check browser console for JavaScript errors

2. **Video Playback Issues**:
   - Verify that the Kaltura API credentials are correct
   - Check if the video ID is valid
   - Look for API errors in the server logs

3. **Synchronization Issues**:
   - Ensure all users are in the same voice channel
   - Check if the host has proper permissions
   - Verify network connectivity for all users

## Reporting Issues

If you encounter any issues during testing, please:

1. Take screenshots of the error
2. Note the steps to reproduce the issue
3. Check the server logs for relevant error messages
4. Report the issue with all collected information

## Next Steps After Testing

Once testing is complete and all issues are resolved:

1. For development environment:
   - Document any findings or issues
   - Make necessary code adjustments
   - Re-test after changes

2. For production deployment:
   - Run the pre-deployment tests: `./test-before-deploy.sh`
   - Deploy to production: `./deploy-prod.sh`
   - Verify production functionality