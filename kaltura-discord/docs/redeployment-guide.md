# Redeploying the Kaltura Discord Bot

This guide explains how to redeploy the Kaltura Discord bot after making updates to the code.

## Local Development Redeployment

If you're running the bot locally for development:

1. **Stop the current instance** of the bot if it's running (Ctrl+C in the terminal)

2. **Build the updated code**:
   ```bash
   npm run build
   ```

3. **Start the bot in development mode**:
   ```bash
   npm run dev
   ```

4. **Verify the bot is online** in your Discord server

## Production Redeployment

For production environments:

### Option 1: Manual Redeployment

1. **SSH into your server** where the bot is hosted

2. **Navigate to the bot directory**:
   ```bash
   cd /path/to/kaltura-discord
   ```

3. **Pull the latest changes** if you're using Git:
   ```bash
   git pull origin main
   ```

4. **Install any new dependencies**:
   ```bash
   npm install
   ```

5. **Build the updated code**:
   ```bash
   npm run build
   ```

6. **Restart the bot**:
   
   If using PM2:
   ```bash
   pm2 restart kaltura-discord
   ```
   
   If using systemd:
   ```bash
   sudo systemctl restart kaltura-discord
   ```
   
   If running directly:
   ```bash
   npm start
   ```

### Option 2: Using Docker

If you're using Docker:

1. **Build a new Docker image**:
   ```bash
   docker build -t kaltura-discord:latest .
   ```

2. **Stop the current container**:
   ```bash
   docker stop kaltura-discord
   ```

3. **Remove the old container**:
   ```bash
   docker rm kaltura-discord
   ```

4. **Start a new container with the updated image**:
   ```bash
   docker run -d --name kaltura-discord \
     --env-file .env \
     -v $(pwd)/config:/app/config \
     -v $(pwd)/logs:/app/logs \
     kaltura-discord:latest
   ```

## Updating Configuration

If you need to update the configuration for the VOD functionality:

1. **Edit the default configuration**:
   ```bash
   nano config/default_config.json
   ```

2. **Add or update the Kaltura session privileges** in the `kaltura.session.privileges` section:
   ```json
   "kaltura": {
     "session": {
       "privileges": {
         "default": "",
         "video": "privacycontext:YOUR_PRIVACY_CONTEXT,searchcontext:YOUR_SEARCH_CONTEXT,setrole:PLAYBACK_BASE_ROLE",
         "meeting": "virtualeventid:YOUR_EVENT_ID,eventsessioncontextid:*,appid:YOUR_APP_ID"
       }
     }
   }
   ```

3. **Update your environment variables** if needed:
   ```bash
   nano .env
   ```
   
   Add the new variables:
   ```
   KALTURA_PLAYER_ID=your_kaltura_player_id
   ```

4. **Restart the bot** using the appropriate method for your deployment

## Verifying the Deployment

After redeploying:

1. **Check the logs** for any errors:
   ```bash
   tail -f logs/app.log
   ```

2. **Test the new VOD functionality** in Discord:
   - Use the `/kaltura-video-search` command with a search term
   - Verify that videos appear in the results
   - Test the video playback by clicking on a video

3. **Monitor the bot's performance** for any issues

## Troubleshooting

If you encounter issues after redeployment:

1. **Check the logs** for specific error messages

2. **Verify your Kaltura session privileges** are correctly configured

3. **Ensure the bot has the necessary permissions** in Discord

4. **Check that all environment variables** are properly set

5. **Try increasing the log level** to debug for more detailed information:
   ```
   LOG_LEVEL=debug
   ```

If problems persist, you may need to roll back to a previous version until the issues are resolved.