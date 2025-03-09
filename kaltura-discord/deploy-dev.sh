#!/bin/bash
# deploy-dev.sh - Development deployment script

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  
  # Load environment variables safely without sourcing the file
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z "$key" ]]; then
      continue
    fi
    
    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    
    # Export the variable
    export "$key=$value"
  done < .env
  
  # Set development-specific environment variables
  export NODE_ENV=development
  export DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com
  export PUBLIC_URL=https://discord-dev.zoharbabin.com
  export API_GATEWAY_URL=https://discord-dev.zoharbabin.com/api
  export ENABLE_API_GATEWAY=true
else
  echo "Error: .env file not found"
  echo "Please create a .env file with the required environment variables"
  exit 1
fi

# Build main Discord bot
echo "Building main Discord bot..."
npm run build

# Build Discord Activity
echo "Building Discord Activity..."
cd discord-activity
if command -v pnpm &> /dev/null; then
  pnpm run build:dev
else
  echo "pnpm not found, installing..."
  npm install -g pnpm
  pnpm run build:dev
fi
cd ..

# Start the main Discord bot server
echo "Starting main Discord bot server..."
NODE_ENV=development npm run start &
MAIN_SERVER_PID=$!

# Start the Discord Activity server
echo "Starting Discord Activity server..."
cd discord-activity/packages/server
npm run build
NODE_ENV=development PORT=3001 API_GATEWAY_URL=$API_GATEWAY_URL ENABLE_API_GATEWAY=$ENABLE_API_GATEWAY node ./dist/app.js &
ACTIVITY_SERVER_PID=$!
cd ../../..

# Wait for servers to start
echo "Waiting for servers to start..."
sleep 5

# Set up Cloudflare tunnel
echo "Setting up Cloudflare tunnel to discord-dev.zoharbabin.com..."

# Set up the Cloudflare tunnel with the correct configuration
echo "Setting up Cloudflare tunnel..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
  echo "cloudflared not found, please install it first:"
  echo "  macOS: brew install cloudflare/cloudflare/cloudflared"
  echo "  Linux: Follow instructions at https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
  echo "After installing, run 'cloudflared tunnel login' to authenticate"
  
  # Cleanup
  echo "Stopping servers..."
  kill $MAIN_SERVER_PID
  kill $ACTIVITY_SERVER_PID
  exit 1
fi

# Check if tunnel already exists
if cloudflared tunnel list | grep -q "discord-tunnel"; then
  EXISTING_TUNNEL_ID=$(cloudflared tunnel list | grep discord-tunnel | awk '{print $1}')
  echo "Found existing discord-tunnel with ID: $EXISTING_TUNNEL_ID"
  
  # Check if DNS record exists for this tunnel
  if cloudflared tunnel route dns list | grep -q "$EXISTING_TUNNEL_ID.*discord-dev.zoharbabin.com"; then
    echo "Found existing DNS record for discord-dev.zoharbabin.com"
    
    # Ask user what to do
    read -p "Use existing tunnel configuration? (y/n): " USE_EXISTING
    if [[ $USE_EXISTING =~ ^[Yy]$ ]]; then
      echo "Using existing tunnel configuration..."
      TUNNEL_ID=$EXISTING_TUNNEL_ID
    else
      echo "Deleting existing discord-tunnel..."
      cloudflared tunnel delete -f $EXISTING_TUNNEL_ID
      
      # Create a new tunnel
      echo "Creating new discord-tunnel..."
      cloudflared tunnel create discord-tunnel
      
      # Get the tunnel ID
      TUNNEL_ID=$(cloudflared tunnel list | grep discord-tunnel | awk '{print $1}')
      echo "Tunnel ID: $TUNNEL_ID"
    fi
  else
    echo "Existing tunnel found but no DNS record for discord-dev.zoharbabin.com"
    echo "Using existing tunnel and creating DNS record..."
    TUNNEL_ID=$EXISTING_TUNNEL_ID
  fi
else
  # Create a new tunnel
  echo "Creating new discord-tunnel..."
  cloudflared tunnel create discord-tunnel
  
  # Get the tunnel ID
  TUNNEL_ID=$(cloudflared tunnel list | grep discord-tunnel | awk '{print $1}')
  echo "Tunnel ID: $TUNNEL_ID"
fi

# Create config.yml in the discord-activity directory
echo "Creating config.yml for tunnel $TUNNEL_ID"
HOME_DIR=$(eval echo ~$USER)
cat > ./discord-activity/config.yml << EOL
tunnel: $TUNNEL_ID
credentials-file: $HOME_DIR/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: discord-dev.zoharbabin.com
    service: http://localhost:3001
  - service: http_status:404
EOL

# Check if Cloudflare credentials exist
echo "Checking Cloudflare credentials..."
if [ ! -f "$HOME_DIR/.cloudflared/cert.pem" ]; then
  echo "Warning: Cloudflare credentials not found. You may need to run 'cloudflared login' first."
  echo "Attempting to continue anyway..."
fi

# Only set up DNS if we're not using an existing tunnel with DNS already configured
if [[ ! $USE_EXISTING =~ ^[Yy]$ ]] || ! cloudflared tunnel route dns list 2>/dev/null | grep -q "$TUNNEL_ID.*discord-dev.zoharbabin.com"; then
  # Check for existing DNS records in Cloudflare
  echo "Checking for existing DNS records in Cloudflare..."
  
  # First, check if the domain is already routed to a tunnel via IP
  EXISTING_ROUTES=$(cloudflared tunnel route ip show | grep discord-dev.zoharbabin.com || true)
  if [ ! -z "$EXISTING_ROUTES" ]; then
    echo "Found existing IP routes for discord-dev.zoharbabin.com, cleaning up..."
    # Delete existing routes
    cloudflared tunnel route ip delete discord-dev.zoharbabin.com || true
  fi
  
  # Check for existing DNS records
  if cloudflared tunnel route dns list 2>/dev/null | grep -q "discord-dev.zoharbabin.com"; then
    echo "Found existing DNS records for discord-dev.zoharbabin.com"
    
    # Check if the DNS record is associated with a different tunnel
    DNS_TUNNEL_ID=$(cloudflared tunnel route dns list | grep discord-dev.zoharbabin.com | awk '{print $1}')
    if [ "$DNS_TUNNEL_ID" != "$TUNNEL_ID" ]; then
      echo "DNS record is associated with a different tunnel ($DNS_TUNNEL_ID)"
      echo "Attempting to update DNS record to use our tunnel..."
      
      # Try to add our DNS record (it may override the existing one)
      if ! cloudflared tunnel route dns $TUNNEL_ID discord-dev.zoharbabin.com; then
        echo "Warning: Failed to update DNS route. This might be because of Cloudflare restrictions."
        echo "You may need to manually update the DNS record in the Cloudflare dashboard."
      fi
    else
      echo "DNS record is already correctly configured for this tunnel"
    fi
  else
    # No existing DNS record, create one
    echo "Setting up DNS routing for discord-dev.zoharbabin.com to tunnel $TUNNEL_ID..."
    if ! cloudflared tunnel route dns $TUNNEL_ID discord-dev.zoharbabin.com; then
      echo "Warning: Failed to route DNS. This might be because of Cloudflare restrictions."
      echo "You may need to manually add a CNAME record in the Cloudflare dashboard:"
      echo "  Name: discord-dev"
      echo "  Target: $TUNNEL_ID.cfargotunnel.com"
    fi
  fi
else
  echo "Using existing DNS configuration for tunnel $TUNNEL_ID"
fi

# Wait for DNS propagation
echo "Waiting for DNS propagation (5 seconds)..."
sleep 5

# Function to test the domain
test_domain() {
  local url=$1
  local max_attempts=$2
  local attempt=1
  local success=false

  echo "Testing domain: $url"
  
  while [ $attempt -le $max_attempts ] && [ "$success" = false ]; do
    echo "Attempt $attempt of $max_attempts..."
    
    # Try to access the URL with more detailed output
    echo "Sending request to $url..."
    
    # First, check if the domain resolves
    if ! host $(echo "$url" | sed -e 's|^[^/]*//||' -e 's|/.*$||') >/dev/null 2>&1; then
      echo "Warning: Domain does not resolve. DNS may not be propagated yet."
    fi
    
    # Try to access the URL with verbose output in case of failure
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response_code" = "200" ]; then
      echo "Success! Domain is accessible."
      success=true
      break
    else
      echo "Failed with status code: $response_code"
      
      # Try to get more information about the failure
      if [ "$response_code" = "000" ]; then
        echo "Connection failed. The server may not be reachable."
      elif [ "$response_code" = "502" ] || [ "$response_code" = "503" ] || [ "$response_code" = "504" ]; then
        echo "Gateway error. The Cloudflare tunnel may not be properly connected to your local server."
      elif [ "$response_code" = "1033" ]; then
        echo "Cloudflare error 1033: Host header invalid. Check your DNS configuration."
      fi
      
      if [ $attempt -lt $max_attempts ]; then
        echo "Waiting 10 seconds before next attempt..."
        sleep 10
      fi
      attempt=$((attempt+1))
    fi
  done
  
  if [ "$success" = false ]; then
    echo "Warning: Could not verify domain accessibility after $max_attempts attempts."
    echo "Troubleshooting steps:"
    echo "1. Check if 'cloudflared tunnel list' shows your tunnel as active"
    echo "2. Verify that 'cloudflared tunnel route dns list' shows your domain"
    echo "3. Make sure your local server is running on port 3001"
    echo "4. Check Cloudflare dashboard for any DNS issues"
    echo "Continuing with deployment..."
  fi
  
  return $([ "$success" = true ] && echo 0 || echo 1)
}

# Start the tunnel in the background
echo "Running Cloudflare tunnel in the background..."
cd discord-activity
cloudflared tunnel --config ./config.yml run &
TUNNEL_PID=$!

# Wait for the tunnel to establish
echo "Waiting for tunnel to establish (10 seconds)..."
sleep 10

# Test the domain
echo "Testing domain accessibility..."
test_domain "https://discord-dev.zoharbabin.com/api/health" 3

# Verify tunnel status
echo "Verifying tunnel status..."
if cloudflared tunnel info $TUNNEL_ID >/dev/null 2>&1; then
  TUNNEL_STATUS=$(cloudflared tunnel info $TUNNEL_ID | grep -i "status" || echo "Status: Unknown")
  echo "Tunnel status: $TUNNEL_STATUS"
  
  # Check if the tunnel is routing correctly
  echo "Checking tunnel routing..."
  DNS_ROUTES=$(cloudflared tunnel route dns list | grep discord-dev.zoharbabin.com || echo "No DNS routes found")
  echo "DNS routes: $DNS_ROUTES"
  
  # Display tunnel information
  echo "Tunnel information:"
  cloudflared tunnel info $TUNNEL_ID
  
  # Check if the tunnel is actually running
  if ps aux | grep -v grep | grep -q "cloudflared.*$TUNNEL_ID"; then
    echo "Tunnel process is running."
  else
    echo "Warning: Tunnel process may not be running properly."
  fi
else
  echo "Warning: Could not get tunnel information. The tunnel may not be properly configured."
fi

# Check local server accessibility
echo "Checking local server accessibility..."
if curl -s http://localhost:3001/api/health >/dev/null; then
  echo "Local server is accessible."
else
  echo "Warning: Local server is not accessible. The tunnel may not work correctly."
fi

# Keep the tunnel running in the foreground
echo "Tunnel is running. Press Ctrl+C to stop."
wait $TUNNEL_PID

# Cleanup function
function cleanup {
  echo "Stopping servers and tunnel..."
  kill $MAIN_SERVER_PID 2>/dev/null || true
  kill $ACTIVITY_SERVER_PID 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  exit
}

# Register cleanup function on script exit
trap cleanup EXIT