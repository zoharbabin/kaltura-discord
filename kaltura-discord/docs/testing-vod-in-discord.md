# Testing VOD Functionality in Discord

This guide explains how to test the new VOD functionality directly in Discord after implementing it.

## Prerequisites

1. A Discord server where you have administrator permissions
2. The Kaltura Discord bot already set up and added to your server
3. Valid Kaltura API credentials configured in your `.env` file

## Step 1: Start the Bot

1. Make sure you've built the latest version of the bot:
   ```bash
   npm run build
   ```

2. Start the bot in development mode:
   ```bash
   npm run dev
   ```

   You should see output indicating that the bot has started and connected to Discord.

## Step 2: Register the New Command

The new VOD search command needs to be registered with Discord before it can be used. There are two ways to do this:

### Option 1: Restart the Bot

If you've already set up the bot previously, simply restarting it should register the new command automatically. The bot registers all commands on startup.

### Option 2: Force Command Registration

If the command doesn't appear after restarting, you may need to force a command registration:

1. Stop the bot if it's running
2. Delete the `.env` file or temporarily change the `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID` values
3. Restore the correct values
4. Restart the bot

This forces the bot to re-register all commands with Discord.

## Step 3: Use the Command in Discord

1. Open Discord and navigate to a channel in your server where the bot has permissions
2. Type `/` to bring up the slash command menu
3. Look for `kaltura-video-search` in the command list
4. Select the command and fill in the parameters:
   - `query`: Enter a search term (e.g., "lecture" or "test")
   - `limit`: (Optional) Enter a number between 1-10 for the maximum number of results

5. Press Enter to execute the command

## Step 4: Test the Video Playback

1. After the search results appear, click on one of the "Play" buttons for a video
2. The bot should respond with an embed containing video details and a "Watch Video" button
3. Click the "Watch Video" button to open the video in a Kaltura player

## Troubleshooting

### Command Not Appearing

If the `/kaltura-video-search` command doesn't appear in the slash command list:

1. Check that the bot is online in your server
2. Verify that the bot has the `applications.commands` scope
3. Try forcing command registration as described in Step 2, Option 2
4. Check the bot's console output for any errors during command registration

### Permission Errors

If you get permission errors when using the command:

1. Make sure the bot has the necessary permissions in the channel
2. Check if the command is restricted to specific roles in your configuration
3. Verify that your Discord user has the required roles

### API Errors

If the bot responds with API errors:

1. Check that your Kaltura API credentials are correctly set in the `.env` file
2. Verify that your Kaltura account has access to videos
3. Check the bot's console output for detailed error messages

## Next Steps

After confirming that the VOD functionality works correctly, you can:

1. Configure role-based permissions for the command in your server configuration
2. Customize the appearance of video embeds if needed
3. Set up additional commands or features related to video management