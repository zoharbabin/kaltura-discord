# Discord Bot Setup Guide

This guide provides detailed instructions for setting up and configuring your Discord bot for the Kaltura-Discord integration.

## Automated Setup

The Kaltura-Discord integration includes an automated setup script that helps you configure your Discord bot. This script:

1. Validates your Discord bot token
2. Checks which intents are enabled
3. Generates an OAuth2 URL for adding the bot to servers
4. Provides guidance for manual steps in the Discord Developer Portal

### Running the Setup Script

You can run the Discord bot setup script in two ways:

1. During the initial setup process:
   ```bash
   ./setup-and-test.sh
   ```
   When prompted, choose "y" to run the Discord bot setup.

2. Separately using npm:
   ```bash
   npm run setup:discord
   ```

## Manual Setup

If you prefer to set up your Discord bot manually, follow these steps:

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "Kaltura Integration")
3. Navigate to the "Bot" tab
4. Click "Add Bot" and confirm

### 2. Configure Bot Settings

1. Under the "Bot" tab:
   - Set a username for your bot
   - Upload an avatar (optional)
   - Toggle off "Public Bot" if you don't want others to add your bot
   - Under "Privileged Gateway Intents", enable ALL of the following:
     - PRESENCE INTENT
     - SERVER MEMBERS INTENT
     - MESSAGE CONTENT INTENT

### 3. Get Bot Token and Client ID

1. Under the "Bot" tab:
   - Click "Reset Token" and copy the new token
   - Add this token to your `.env` file as `DISCORD_BOT_TOKEN`

2. Under the "General Information" tab:
   - Copy the "Application ID"
   - Add this ID to your `.env` file as `DISCORD_CLIENT_ID`

### 4. Generate OAuth2 URL

1. Go to the "OAuth2" tab
2. Under "OAuth2 URL Generator", select the following scopes:
   - `bot`
   - `applications.commands`
3. Under "Bot Permissions", select only the following minimal permissions needed:
   
   **General Permissions:**
   - `View Channels` - Needed to see channels where commands are used
   
   **Text Permissions:**
   - `Send Messages` - Needed to send responses to commands
   - `Embed Links` - Needed for rich embeds in responses
   - `Read Message History` - Needed to read context of commands
   - `Use Application Commands` - Needed for slash commands
   - `Add Reactions` - Needed for interactive responses
4. Copy the generated URL

### 5. Add Bot to Your Server

1. Open the OAuth2 URL in your browser
2. Select the server you want to add the bot to
3. Click "Authorize" and complete the CAPTCHA if prompted

## Troubleshooting

### "Used disallowed intents" Error

If your bot fails to connect with a "Used disallowed intents" error, you need to either:

1. Enable the required intents in the Discord Developer Portal:
   - Go to your application in the [Discord Developer Portal](https://discord.com/developers/applications)
   - Navigate to the "Bot" tab
   - Under "Privileged Gateway Intents", enable the required intents (e.g., MESSAGE CONTENT INTENT)

2. Or modify the bot code to remove the privileged intents:
   - Open `src/discord/bot.ts`
   - Comment out or remove the privileged intents (e.g., `GatewayIntentBits.MessageContent`)

### Bot Not Responding to Commands

If your bot is online but not responding to commands:

1. Check if the commands are registered:
   - Look for the message "Successfully reloaded application (/) commands" in the logs
   - If not, check your `DISCORD_CLIENT_ID` and `DISCORD_BOT_TOKEN` in the `.env` file

2. Check if the bot has the necessary permissions:
   - The bot needs "Send Messages" and "Use Slash Commands" permissions
   - You may need to re-add the bot to your server with the correct permissions

### Bot Token Issues

If you see authentication errors:

1. Reset your bot token in the Discord Developer Portal
2. Update the `DISCORD_BOT_TOKEN` in your `.env` file
3. Restart the application

## Discord API Rate Limits

Be aware that Discord imposes rate limits on API requests. If you're making many requests in a short period, you might hit these limits. The setup script and application are designed to respect these limits, but if you're running multiple instances or making manual API calls, you might encounter rate limiting.

For more information, see the [Discord API Rate Limits documentation](https://discord.com/developers/docs/topics/rate-limits).