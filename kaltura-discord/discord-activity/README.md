# Kaltura Discord Activity

This is a Discord Activity for watching Kaltura videos together in a Discord voice channel.

## Development Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   pnpm run dev
   ```

## Environment Configuration

The application supports different environments:

- **Development**: Uses `.env.development` with local URLs
- **Production**: Uses `.env.production` with the Cloudflare-tunneled domain

## Deployment to Cloudflare

### Prerequisites

1. Install Cloudflare CLI:
   ```bash
   # For macOS
   brew install cloudflare/cloudflare/cloudflared
   
   # For Linux
   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. Authenticate with Cloudflare:
   ```bash
   cloudflared tunnel login
   ```

### Setting Up the Tunnel

1. Create a tunnel:
   ```bash
   cloudflared tunnel create discord-tunnel
   ```

2. Update the `config.yml` file with your tunnel ID:
   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: ~/.cloudflared/YOUR_TUNNEL_ID.json
   
   ingress:
     - hostname: discord.zoharbabin.com
       service: http://localhost:3000
     - service: http_status:404
   ```

3. Route DNS to your tunnel:
   ```bash
   cloudflared tunnel route dns discord-tunnel discord.zoharbabin.com
   ```

### Building and Deploying

1. Build the application for production:
   ```bash
   pnpm run build:prod
   ```

2. Run the tunnel:
   ```bash
   cloudflared tunnel run discord-tunnel
   ```

   Or use the shortcut:
   ```bash
   pnpm run deploy
   ```

### Discord Developer Portal Configuration

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "Activities" in the sidebar
4. Add Activity URL Mappings:
   - Add `cdnapisec.kaltura.com` to allow loading Kaltura resources
   - Add `discord.zoharbabin.com` to allow loading your custom domain

## Troubleshooting

### CORS Issues

If you encounter CORS issues, make sure your Cloudflare Workers configuration includes the necessary headers.

### SSL/TLS Issues

Ensure that your Cloudflare SSL/TLS encryption mode is set to "Full" or "Full (strict)" in the Cloudflare dashboard.

### Discord Activity Not Loading

If the Discord Activity is not loading:

1. Check the browser console for errors
2. Verify that the Activity URL Mappings in the Discord Developer Portal are correct
3. Ensure your Cloudflare tunnel is running and properly configured
4. Check that your application is correctly built and deployed