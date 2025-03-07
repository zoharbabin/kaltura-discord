# End-to-End Testing Guide for Kaltura-Discord Integration

This guide provides step-by-step instructions for running end-to-end tests on the Kaltura-Discord integration project.

## Prerequisites

- Node.js v18 or higher
- npm v8 or higher
- Discord Bot Token and Client ID (already configured in your `.env` file)
- Kaltura Partner ID and Admin Secret (already configured in your `.env` file)

## Step 1: Build the Project

First, make sure the project is built with the latest changes:

```bash
cd kaltura-discord
npm run build
```

## Step 2: Run the Automated End-to-End Test

The project includes an automated end-to-end test script that tests all components of the integration:

```bash
node tests/end-to-end-test.js
```

This script will:
- Initialize the Configuration Service
- Test the Configuration Service
- Test the User Authentication Service
- Test the Kaltura Client
- Test the API Gateway (mock)
- Test Discord Bot Commands (mock)

## Step 3: Start the Application

Start the application to test it with actual Discord and Kaltura APIs:

```bash
npm run dev
```

## Step 4: Test Discord Bot Commands

If your Discord bot is already added to a Discord server, you can test the following slash commands:

1. `/kaltura-start` - Create a new meeting
   - Options:
     - `type`: Select a meeting type (webinar, meeting, classroom)
     - `title`: Enter a meeting title
     - `description`: (Optional) Enter a meeting description

2. `/kaltura-join` - Join an existing meeting
   - Options:
     - `meeting-id`: Enter the ID of a meeting created in step 1

3. `/kaltura-list` - List all active meetings
   - This command will show all active meetings with options to join or end them

4. `/kaltura-end` - End a meeting
   - Options:
     - `meeting-id`: Enter the ID of a meeting to end

5. `/kaltura-config-view` - View the current configuration
   - Options:
     - `section`: (Optional) Select a configuration section to view

6. `/kaltura-config-update` - Update a configuration setting
   - Options:
     - `section`: Select a configuration section to update
     - `key`: Enter the configuration key to update
     - `value`: Enter the new value for the configuration key

7. `/kaltura-config-reset` - Reset configuration to defaults
   - Options:
     - `section`: (Optional) Select a configuration section to reset
     - `confirm`: Confirm the reset operation

## Step 5: Test API Endpoints

You can use a tool like Postman or curl to test the API endpoints:

1. Generate a token:
   ```bash
   curl -X POST http://localhost:3000/api/auth/token \
     -H "Content-Type: application/json" \
     -d '{"discordId":"123456789","username":"testuser","roles":["admin"]}'
   ```

2. List meetings (using the token from step 1):
   ```bash
   curl -X GET http://localhost:3000/api/meetings \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. Create a meeting:
   ```bash
   curl -X POST http://localhost:3000/api/meetings \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Meeting","description":"Test Description","type":"webinar"}'
   ```

4. Get a meeting (replace MEETING_ID with an actual meeting ID):
   ```bash
   curl -X GET http://localhost:3000/api/meetings/MEETING_ID \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

5. Generate join URL for a meeting:
   ```bash
   curl -X POST http://localhost:3000/api/meetings/MEETING_ID/join \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

6. End a meeting:
   ```bash
   curl -X DELETE http://localhost:3000/api/meetings/MEETING_ID \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## Step 6: Verify Results

During testing, verify the following:

1. **Discord Bot Commands**:
   - Commands respond with appropriate embeds and buttons
   - Meeting creation generates a valid Kaltura meeting
   - Join links work and take you to the Kaltura meeting
   - Meeting listing shows all active meetings
   - Meeting ending successfully ends the meeting in Kaltura

2. **API Endpoints**:
   - Authentication endpoints generate valid tokens
   - Meeting endpoints create, retrieve, and manage meetings
   - Error handling returns appropriate error messages

3. **Configuration**:
   - Default configuration is loaded correctly
   - Server-specific configuration overrides are applied
   - Configuration commands work as expected

## Expected Errors During Testing

When running the end-to-end tests, you may see some error messages in the logs. These are expected and are being handled gracefully by the test script. The most common errors you might see include:

1. **Failed to list meetings**: This error occurs in the `listMeetings` function and is expected in test environments.

2. **Error handling commands**: These errors occur in the command handlers and are expected when using mock interactions.

These errors don't indicate a problem with the code itself but rather reflect the limitations of testing with mock responses. In a production environment with actual API credentials, these errors would not occur.

## Troubleshooting

### Discord Bot Not Responding

- Check if the bot is online in Discord
- Verify that the bot token is correct in the `.env` file
- Check the logs for any errors

### Kaltura API Errors

- Verify that the Kaltura Partner ID and Admin Secret are correct
- Check if the Kaltura API endpoint is accessible
- Look for specific error messages in the logs

### Configuration Issues

- Ensure that the `config/default_config.json` file exists and is valid JSON
- Check if the `config/overrides` directory exists and is writable
- Verify that server-specific configurations are correctly formatted

### Mock Response Issues

If you're seeing unexpected errors with mock responses:

1. Check that the `useMockResponses` flag is being set correctly in the Kaltura client
2. Verify that the mock methods are implemented correctly
3. Consider adding more robust error handling to the mock methods

## Logs

Logs are stored in the `logs` directory:
- `logs/combined.log`: All logs
- `logs/error.log`: Error logs only

You can adjust the log level in the `.env` file:
```
LOG_LEVEL=debug  # For more detailed logs
```

## Next Steps

After completing the end-to-end testing:

1. Document any issues or bugs found
2. Complete any remaining documentation
3. Implement versioning for commands and APIs
4. Begin work on Phase 2: Enhanced Notifications & User Sync