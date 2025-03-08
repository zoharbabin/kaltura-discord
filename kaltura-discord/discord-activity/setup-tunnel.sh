#!/bin/bash
# setup-tunnel.sh - Script to set up a new Cloudflare tunnel with the correct configuration

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
  echo "cloudflared not found, please install it first:"
  echo "  macOS: brew install cloudflare/cloudflare/cloudflared"
  echo "  Linux: Follow instructions at https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
  exit 1
fi

# Delete existing tunnel if it exists
if cloudflared tunnel list | grep -q "discord-tunnel"; then
  echo "Deleting existing discord-tunnel..."
  TUNNEL_ID=$(cloudflared tunnel list | grep discord-tunnel | awk '{print $1}')
  cloudflared tunnel delete -f $TUNNEL_ID
fi

# Create a new tunnel
echo "Creating new discord-tunnel..."
cloudflared tunnel create discord-tunnel

# Get the tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep discord-tunnel | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Create config.yml
echo "Creating config.yml for tunnel $TUNNEL_ID"
cat > config.yml << EOL
tunnel: $TUNNEL_ID
credentials-file: ~/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: discord-dev.zoharbabin.com
    service: http://localhost:3001
  - service: http_status:404
EOL

# Route DNS
echo "Routing DNS for discord-dev.zoharbabin.com to discord-tunnel..."
cloudflared tunnel route dns discord-tunnel discord-dev.zoharbabin.com

echo "Tunnel setup complete. You can now run the tunnel with:"
echo "cloudflared tunnel run discord-tunnel"