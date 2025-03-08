# VOD Functionality Testing Guide

This guide outlines the steps to test the Video on Demand (VOD) functionality in the Kaltura Discord bot.

## Prerequisites

1. A Discord server with the Kaltura bot installed and configured
2. Proper permissions to use the bot commands
3. Access to Kaltura with videos available for searching

## Testing the VOD Search Command

### Basic Search Test

1. In a Discord channel where the bot is active, type:
   ```
   /kaltura-video-search query:test
   ```
2. Verify that:
   - The bot responds with a list of videos matching the search term "test"
   - Each video entry shows title and duration
   - Play buttons are available for each video

### Search with Limit Test

1. In a Discord channel where the bot is active, type:
   ```
   /kaltura-video-search query:lecture limit:3
   ```
2. Verify that:
   - The bot responds with a maximum of 3 videos matching the search term "lecture"
   - Each video has a corresponding "Play" button

### No Results Test

1. In a Discord channel where the bot is active, type:
   ```
   /kaltura-video-search query:xyznonexistentterm123
   ```
2. Verify that:
   - The bot responds with a message indicating no videos were found

## Testing Video Playback

1. After performing a search, click on one of the "Play" buttons for a video
2. Verify that:
   - The bot responds with an embed containing:
     - Video title
     - Video description (if available)
     - Duration information
     - View count
     - A "Watch Video" button
3. Click the "Watch Video" button
4. Verify that:
   - You are directed to a Kaltura player page
   - The correct video starts playing

## Error Handling Tests

### Permission Test

1. Configure the bot to restrict video search to specific roles
2. Use an account without the required role to run:
   ```
   /kaltura-video-search query:test
   ```
3. Verify that:
   - The bot responds with a permission error message

### Server Configuration Test

1. Disable commands for a test server
2. Run the video search command
3. Verify that:
   - The bot responds that commands are disabled for this server

## Integration Tests

### Automated Tests

The VOD functionality is automatically tested as part of the end-to-end tests. You can run these tests using either:

1. The setup script:
   ```bash
   ./setup-and-test.sh
   ```
   This will run all tests including the VOD functionality tests.

2. Or directly with:
   ```bash
   npm run test:e2e
   ```

Verify that all VOD-related tests pass successfully.

## Performance Tests

### Large Result Set Test

1. Search for a common term that will return many results:
   ```
   /kaltura-video-search query:a limit:10
   ```
2. Verify that:
   - The response time is reasonable (under 5 seconds)
   - The results are properly paginated if applicable
   - All videos have functional play buttons

## Troubleshooting

If any tests fail, check the following:

1. Bot logs for error messages
2. Kaltura API connectivity
3. Discord API rate limits
4. Permission configurations in both Discord and Kaltura

Report any issues with detailed steps to reproduce, expected behavior, and actual behavior.