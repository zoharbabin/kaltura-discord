# Discord Activity Cloudflare Deployment Guide

## Updated Configuration

Update the Discord Activity URL in your `.env` file:

```
DISCORD_ACTIVITY_URL=https://discord.zoharbabin.com
```

Or update it in your server configuration:

```
/kaltura-config-update features.discordActivityUrl https://discord.zoharbabin.com
```

## Deploying to Cloudflare

To deploy your Discord Activity application to Cloudflare, follow these steps:

### 1. Prepare Your Application for Deployment

#### Build the Client Application

1. Navigate to the client directory:
   ```bash
   cd discord-activity/packages/client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

   This will create a `dist` directory with the compiled assets.

#### Build the Server Application (if needed)

1. Navigate to the server directory:
   ```bash
   cd ../server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

### 2. Set Up Cloudflare Pages

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Create a `wrangler.toml` file** in the root of your project:
   ```toml
   name = "discord-activity"
   type = "webpack"
   account_id = "your-account-id"
   workers_dev = true
   route = "discord.zoharbabin.com/*"
   zone_id = "your-zone-id"

   [site]
   bucket = "./discord-activity/packages/client/dist"
   entry-point = "workers-site"
   ```

4. **Deploy to Cloudflare Pages**:
   ```bash
   wrangler publish
   ```

### 3. Set Up Cloudflare Tunnel

1. **Install cloudflared**:
   ```bash
   # For macOS
   brew install cloudflare/cloudflare/cloudflared
   
   # For Linux
   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. **Authenticate cloudflared**:
   ```bash
   cloudflared tunnel login
   ```

3. **Create a tunnel**:
   ```bash
   cloudflared tunnel create discord-tunnel
   ```

4. **Configure the tunnel** by creating a `config.yml` file:
   ```yaml
   tunnel: your-tunnel-id
   credentials-file: /path/to/credentials.json
   
   ingress:
     - hostname: discord.zoharbabin.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. **Route DNS to your tunnel**:
   ```bash
   cloudflared tunnel route dns discord-tunnel discord.zoharbabin.com
   ```

6. **Start the tunnel**:
   ```bash
   cloudflared tunnel run discord-tunnel
   ```

### 4. Configure Discord Developer Portal

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "Activities" in the sidebar
4. Add Activity URL Mappings:
   - Add `cdnapisec.kaltura.com` to allow loading Kaltura resources
   - Add `discord.zoharbabin.com` to allow loading your custom domain

### 5. Test Your Deployment

1. Restart your Discord bot with the updated configuration
2. Launch a Discord Activity using the "Watch Together" feature
3. Verify that the activity loads correctly from your custom domain

## Troubleshooting

### CORS Issues

If you encounter CORS issues, make sure your Cloudflare Workers configuration includes the necessary headers:

```js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  
  // Clone the response so that it's no longer immutable
  const newResponse = new Response(response.body, response)
  
  // Add CORS headers
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  
  return newResponse
}
```

### SSL/TLS Issues

Ensure that your Cloudflare SSL/TLS encryption mode is set to "Full" or "Full (strict)" in the Cloudflare dashboard.

### Discord Activity Not Loading

If the Discord Activity is not loading:

1. Check the browser console for errors
2. Verify that the Activity URL Mappings in the Discord Developer Portal are correct
3. Ensure your Cloudflare tunnel is running and properly configured
4. Check that your application is correctly built and deployed

## Monitoring and Logs

To monitor your Cloudflare deployment and view logs:

1. **View tunnel logs**:
   ```bash
   cloudflared tunnel info discord-tunnel
   ```

2. **Check Cloudflare Workers logs** in the Cloudflare dashboard under "Workers" > "discord-activity" > "Logs"

3. **Set up Cloudflare Analytics** to monitor traffic and performance