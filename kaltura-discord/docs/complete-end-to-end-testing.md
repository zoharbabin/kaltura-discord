# Complete End-to-End Testing Guide: Connecting Kaltura and Discord

This guide provides step-by-step instructions for running a complete end-to-end test that demonstrates the full integration between Kaltura and Discord.

## Prerequisites

1. **Discord Developer Account and Bot**
   - A Discord account with developer access
   - A registered Discord application with a bot
   - Bot token and client ID
   - Bot added to a test Discord server with proper permissions

2. **Kaltura Account**
   - Kaltura Partner ID
   - Kaltura Admin Secret
   - Access to Kaltura Management Console (KMC)

3. **Environment Setup**
   - Node.js v18 or higher
   - npm v8 or higher
   - Project built and ready to run

## Step 1: Configure Environment Variables

1. Edit the `.env` file to include all required credentials:

```
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_actual_discord_bot_token
DISCORD_CLIENT_ID=your_actual_discord_client_id
DISCORD_CLIENT_SECRET=your_actual_discord_client_secret

# Kaltura API Configuration
KALTURA_PARTNER_ID=your_actual_kaltura_partner_id
KALTURA_ADMIN_SECRET=your_actual_kaltura_admin_secret
KALTURA_API_ENDPOINT=https://www.kaltura.com/api_v3

# API Gateway Configuration
API_PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=a_secure_random_string_for_jwt_signing
JWT_EXPIRY=1h

# Logging Configuration
LOG_LEVEL=info
```

Make sure to replace all placeholder values with your actual credentials.

## Step 2: Build the Project

```bash
npm run build
```

## Step 3: Start the Application

```bash
npm run dev
```

This will start both the Discord bot and the API Gateway.

## Step 4: Verify Discord Bot Connection

1. Check the console logs to confirm the Discord bot has connected successfully:
   ```
   info: Discord bot logged in as YourBotName#1234
   info: Discord bot started successfully
   ```

2. Go to your test Discord server and verify that the bot is online (green dot next to its name in the member list).

3. Check that the slash commands are registered by typing `/` in a text channel and looking for the Kaltura commands:
   - `/kaltura-start`
   - `/kaltura-join`
   - `/kaltura-list`
   - `/kaltura-end`
   - `/kaltura-config-view`
   - `/kaltura-config-update`
   - `/kaltura-config-reset`

## Step 5: Test Discord Commands

### 1. Create a Meeting

1. In your test Discord server, use the `/kaltura-start` command:
   - Type `/kaltura-start`
   - Select a meeting type (webinar, meeting, or classroom)
   - Enter a title for the meeting
   - Optionally enter a description
   - Submit the command

2. Verify that the bot responds with an embed containing:
   - Meeting title and type
   - Meeting ID
   - Join, Share, and End buttons

3. Check the console logs to confirm the meeting was created successfully:
   ```
   info: Creating Kaltura meeting { user: 'YourUsername#1234', meetingType: 'webinar', title: 'Test Meeting' }
   info: Kaltura meeting created successfully { user: 'YourUsername#1234', meetingId: '1234567890' }
   ```

### 2. Join a Meeting

1. Click the "Join Meeting" button on the embed from the previous step, or use the `/kaltura-join` command:
   - Type `/kaltura-join`
   - Enter the meeting ID from the previous step
   - Submit the command

2. Verify that the bot responds with a join link.

3. Click the join link and verify that it takes you to the Kaltura meeting.

4. Check the console logs to confirm the join URL was generated successfully:
   ```
   info: User joining meeting via button { user: 'YourUsername#1234', meetingId: '1234567890' }
   ```

### 3. List Meetings

1. Use the `/kaltura-list` command:
   - Type `/kaltura-list`
   - Submit the command

2. Verify that the bot responds with a list of active meetings, including the one you created.

3. Check the console logs to confirm the meetings were listed successfully:
   ```
   info: Listing Kaltura meetings { user: 'YourUsername#1234', guild: 'Your Server Name' }
   info: Kaltura meetings listed successfully { user: 'YourUsername#1234', count: 1 }
   ```

### 4. Share a Meeting

1. Click the "Share with Channel" button on the embed from the first step.

2. Verify that the bot posts a message in the channel with meeting details and a join button.

3. Check the console logs to confirm the meeting was shared successfully:
   ```
   info: Kaltura meeting shared with channel { user: 'YourUsername#1234', meetingId: '1234567890', channel: '123456789012345678' }
   ```

### 5. End a Meeting

1. Click the "End Meeting" button on the embed from the first step, or use the `/kaltura-end` command:
   - Type `/kaltura-end`
   - Enter the meeting ID from the first step
   - Submit the command

2. Verify that the bot responds with a confirmation that the meeting has ended.

3. Check the console logs to confirm the meeting was ended successfully:
   ```
   info: Ending Kaltura meeting { user: 'YourUsername#1234', meetingId: '1234567890' }
   info: Kaltura meeting ended successfully { user: 'YourUsername#1234', meetingId: '1234567890' }
   ```

## Step 6: Test API Endpoints

### 1. Generate an Authentication Token

```bash
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"discordId":"your_discord_id","username":"your_username","roles":["admin"]}'
```

Save the token from the response for use in subsequent requests.

### 2. Create a Meeting

```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"title":"API Test Meeting","description":"Created via API","type":"webinar"}'
```

Save the meeting ID from the response.

### 3. Get Meeting Details

```bash
curl -X GET http://localhost:3000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `MEETING_ID` with the ID from the previous step.

### 4. Generate Join URL

```bash
curl -X POST http://localhost:3000/api/meetings/MEETING_ID/join \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `MEETING_ID` with the ID from step 2.

### 5. End the Meeting

```bash
curl -X DELETE http://localhost:3000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `MEETING_ID` with the ID from step 2.

## Step 7: Verify in Kaltura Management Console

1. Log in to the Kaltura Management Console (KMC).

2. Navigate to the "Meetings" or "Virtual Events" section.

3. Verify that the meetings you created through Discord and the API are listed.

4. Check the meeting details to ensure they match what you specified.

5. If possible, join one of the meetings from the KMC to verify it works from the Kaltura side.

## Step 8: Test Configuration Commands

### 1. View Configuration

1. Use the `/kaltura-config-view` command:
   - Type `/kaltura-config-view`
   - Optionally select a section to view
   - Submit the command

2. Verify that the bot responds with the current configuration.

### 2. Update Configuration

1. Use the `/kaltura-config-update` command:
   - Type `/kaltura-config-update`
   - Select a section to update
   - Enter a configuration key (e.g., `notifications.enabled`)
   - Enter a new value (e.g., `false`)
   - Submit the command

2. Verify that the bot responds with a confirmation of the update.

3. Use the `/kaltura-config-view` command again to verify the change was applied.

### 3. Reset Configuration

1. Use the `/kaltura-config-reset` command:
   - Type `/kaltura-config-reset`
   - Set confirm to `true`
   - Optionally select a section to reset
   - Submit the command

2. Verify that the bot responds with a confirmation of the reset.

3. Use the `/kaltura-config-view` command again to verify the configuration was reset.

## Troubleshooting

### Discord Bot Issues

1. **Bot Not Connecting**
   - Check that the bot token is correct in the `.env` file
   - Verify that the bot has been added to the server
   - Check the console logs for any connection errors

2. **Commands Not Registering**
   - Verify that the client ID is correct in the `.env` file
   - Check the console logs for any registration errors
   - Ensure required options are placed before optional options in command definitions

3. **Permission Errors**
   - Verify that the bot has the necessary permissions in the server
   - Check that the user has the required roles for the command

### Kaltura API Issues

1. **Authentication Errors**
   - Verify that the Partner ID and Admin Secret are correct in the `.env` file
   - Check the console logs for any authentication errors

2. **Meeting Creation Errors**
   - Verify that the meeting parameters are valid
   - Check the console logs for any API errors

3. **Join URL Errors**
   - Verify that the meeting ID is valid
   - Check the console logs for any URL generation errors

## Conclusion

By following this guide, you should be able to run a complete end-to-end test of the Kaltura-Discord integration. This test verifies that all components are working together correctly and that users can create, join, and manage Kaltura meetings directly from Discord.

If you encounter any issues during testing, check the console logs for error messages and refer to the troubleshooting section above. If the issue persists, you may need to debug the specific component that's failing.