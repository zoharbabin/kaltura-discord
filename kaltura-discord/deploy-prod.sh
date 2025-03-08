#!/bin/bash
# deploy-prod.sh - Production deployment script

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
  
  # Set production-specific environment variables
  export NODE_ENV=production
  export DISCORD_ACTIVITY_URL=https://discord.zoharbabin.com
  export PUBLIC_URL=https://discord.zoharbabin.com
else
  echo "Error: .env file not found"
  echo "Please run ./simplify-env.sh to create a consolidated .env file"
  exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Error: wrangler not found, please install it first:"
  echo "  npm install -g wrangler"
  exit 1
fi

# Run tests before deployment
echo "Running tests before deployment..."
if [ -f ./test-before-deploy.sh ]; then
  ./test-before-deploy.sh
  
  # Check if tests passed
  if [ $? -ne 0 ]; then
    echo "Error: Tests failed. Aborting deployment."
    exit 1
  fi
else
  echo "Warning: test-before-deploy.sh not found. Skipping tests."
fi

# Build main Discord bot
echo "Building main Discord bot for production..."
NODE_ENV=production npm run build

# Build Discord Activity
echo "Building Discord Activity for production..."
cd discord-activity
if command -v pnpm &> /dev/null; then
  pnpm run build:prod
else
  echo "pnpm not found, installing..."
  npm install -g pnpm
  pnpm run build:prod
fi

# Deploy to Cloudflare using Wrangler
echo "Deploying to Cloudflare..."
if [ -f wrangler.toml ]; then
  echo "Using existing wrangler.toml configuration..."
else
  echo "Creating wrangler.toml configuration..."
  cat > wrangler.toml << EOL
name = "discord-activity"
main = "./packages/server/dist/app.js"
compatibility_date = "$(date +%Y-%m-%d)"

[site]
bucket = "./packages/client/dist"

[env.production]
routes = [
  { pattern = "discord.zoharbabin.com", custom_domain = true }
]

[build]
command = "pnpm run build:prod"
EOL
fi

# Login to Cloudflare if needed
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
  echo "Please login to Cloudflare:"
  wrangler login
fi

# Deploy to Cloudflare
echo "Deploying to Cloudflare..."
wrangler deploy --env production

# Verify deployment
echo "Verifying deployment..."
if curl -s https://discord.zoharbabin.com/api/health | grep -q "ok"; then
  echo "Deployment successful! The application is now available at https://discord.zoharbabin.com"
else
  echo "Warning: Deployment verification failed. The application may not be accessible yet."
  echo "Please check the Cloudflare dashboard for more information."
fi

echo "Production deployment completed."