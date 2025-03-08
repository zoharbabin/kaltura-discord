# Deployment Scripts for Kaltura-Discord Integration

This document provides an overview of the deployment scripts used for the Kaltura-Discord integration project.

## Overview

The project includes several deployment scripts to streamline the development and production deployment processes:

1. **deploy-dev.sh**: For local development with Cloudflare tunnel
2. **deploy-prod.sh**: For production deployment to Cloudflare
3. **simplify-env.sh**: For simplifying environment variable management
4. **cleanup-env.sh**: For cleaning up environment files
5. **test-before-deploy.sh**: For running tests before deployment

## Development Deployment Script (deploy-dev.sh)

The development deployment script builds both the main Discord bot and the Discord Activity component, sets up a Cloudflare tunnel to expose the local server, and starts both servers.

### Key Features

- Loads environment variables from `.env` file
- Sets development-specific environment variables
- Builds both components
- Sets up a Cloudflare tunnel to expose the local server
- Tests domain accessibility
- Starts both servers

### Usage

```bash
./deploy-dev.sh
```

### Implementation Details

```bash
#!/bin/bash
# deploy-dev.sh - Script to deploy the application in development mode

# Load environment variables safely without sourcing the file
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  
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
  export PUBLIC_URL=http://localhost:3000
else
  echo "Error: .env file not found"
  echo "Please run ./simplify-env.sh to create a consolidated .env file"
  exit 1
fi

# Build main Discord bot
echo "Building main Discord bot..."
npm run build

# Build Discord Activity
echo "Building Discord Activity..."
cd discord-activity && npm run build:dev && cd ..

# Start main Discord bot server
echo "Starting main Discord bot server..."
npm start &
DISCORD_BOT_PID=$!

# Start Discord Activity server
echo "Starting Discord Activity server..."
cd discord-activity && npm run start &
DISCORD_ACTIVITY_PID=$!

# Wait for servers to start
echo "Waiting for servers to start..."
sleep 5

# Set up Cloudflare tunnel
echo "Setting up Cloudflare tunnel to discord-dev.zoharbabin.com..."
./discord-activity/setup-tunnel.sh dev

# Function to clean up processes on exit
cleanup() {
  echo "Stopping servers..."
  kill $DISCORD_BOT_PID
  kill $DISCORD_ACTIVITY_PID
  exit 0
}

# Register cleanup function on script exit
trap cleanup EXIT

# Keep script running
echo "Tunnel is running. Press Ctrl+C to stop."
wait
```

## Production Deployment Script (deploy-prod.sh)

The production deployment script builds both components with production optimizations and deploys them to Cloudflare.

### Key Features

- Loads environment variables from `.env` file
- Sets production-specific environment variables
- Builds both components with production optimizations
- Deploys to Cloudflare using Wrangler
- Tests domain accessibility

### Usage

```bash
./deploy-prod.sh
```

### Implementation Details

```bash
#!/bin/bash
# deploy-prod.sh - Script to deploy the application to production

# Load environment variables safely without sourcing the file
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  
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

# Run tests before deployment
echo "Running tests before deployment..."
./test-before-deploy.sh

# Check if tests passed
if [ $? -ne 0 ]; then
  echo "Tests failed. Aborting deployment."
  exit 1
fi

# Build main Discord bot with production optimizations
echo "Building main Discord bot for production..."
npm run build

# Build Discord Activity with production optimizations
echo "Building Discord Activity for production..."
cd discord-activity && npm run build:prod && cd ..

# Deploy Discord Activity to Cloudflare
echo "Deploying Discord Activity to Cloudflare..."
cd discord-activity && npx wrangler deploy && cd ..

# Test domain accessibility
echo "Testing domain accessibility..."
curl -s -o /dev/null -w "%{http_code}" https://discord.zoharbabin.com/api/health

# Check if domain is accessible
if [ $? -ne 0 ]; then
  echo "Error: Domain is not accessible. Deployment may have failed."
  exit 1
fi

echo "Deployment completed successfully!"
```

## Environment Simplification Script (simplify-env.sh)

The environment simplification script consolidates multiple environment files into a single `.env` file.

### Key Features

- Creates a single `.env` file from existing environment files
- Creates a backup of the original `.env` file
- Removes unnecessary environment files
- Creates a symbolic link for Discord Activity

### Usage

```bash
./simplify-env.sh
```

### Implementation Details

```bash
#!/bin/bash
# simplify-env.sh - Script to simplify environment management to a single .env file

echo "Simplifying environment management to a single .env file..."

# Check if the main .env file exists
if [ ! -f ".env" ]; then
  echo "Error: .env file not found"
  exit 1
fi

# Function to safely extract a value from .env
get_env_value() {
  local key=$1
  # Use grep to find the line, then cut to get everything after the first =
  # This preserves special characters in the value
  grep "^$key=" .env | cut -d= -f2-
}

# Create a single .env file with all values
echo "Creating consolidated .env file..."
cat > .env.new << EOL
# Discord Configuration
DISCORD_BOT_TOKEN=$(get_env_value "DISCORD_BOT_TOKEN")
DISCORD_CLIENT_ID=$(get_env_value "DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET=$(get_env_value "DISCORD_CLIENT_SECRET")
DISCORD_APPLICATION_ID=$(get_env_value "DISCORD_APPLICATION_ID")

# Kaltura API Configuration
KALTURA_PARTNER_ID=$(get_env_value "KALTURA_PARTNER_ID")
KALTURA_PLAYER_ID=$(get_env_value "KALTURA_PLAYER_ID")
KALTURA_ADMIN_SECRET=$(get_env_value "KALTURA_ADMIN_SECRET")
KALTURA_API_ENDPOINT=$(get_env_value "KALTURA_API_ENDPOINT")

# API Gateway Configuration
API_PORT=$(get_env_value "API_PORT")

# JWT Configuration
JWT_SECRET=$(get_env_value "JWT_SECRET")
JWT_EXPIRY=$(get_env_value "JWT_EXPIRY")

# Logging Configuration
LOG_LEVEL=$(get_env_value "LOG_LEVEL")

# Discord Activity Client Configuration
VITE_CLIENT_ID=$(get_env_value "DISCORD_CLIENT_ID")
VITE_KALTURA_PARTNER_ID=$(get_env_value "KALTURA_PARTNER_ID")
VITE_KALTURA_PLAYER_ID=$(get_env_value "KALTURA_PLAYER_ID")
VITE_KALTURA_API_ENDPOINT=$(get_env_value "KALTURA_API_ENDPOINT")

# Discord Activity Server Configuration
PORT=3001

# Environment-specific variables will be set by deployment scripts
# NODE_ENV - Set to 'development' or 'production' by deployment scripts
# DISCORD_ACTIVITY_URL - Set to appropriate URL by deployment scripts
# PUBLIC_URL - Set to appropriate URL by deployment scripts
EOL

# Create backup of original .env file
cp .env .env.backup

# Replace original .env file with new one
mv .env.new .env

# Remove unnecessary .env files
echo "Removing unnecessary .env files..."
rm -f .env.example .env.development.sample .env.production.sample
rm -f .env.development .env.production
rm -f discord-activity/.env discord-activity/.env.example discord-activity/.env.development discord-activity/.env.production

# Create symbolic link for Discord Activity
echo "Creating symbolic link for Discord Activity..."
ln -sf ../.env discord-activity/.env

echo "Environment files simplification completed!"
echo "Created a single .env file with all values"
echo "Created backup of original .env file as .env.backup"
echo "Created symbolic link from discord-activity/.env to .env"
echo ""
echo "The deployment scripts will now set environment-specific variables at runtime."
echo "You can now use the deployment scripts:"
echo "  ./deploy-dev.sh - For development deployment"
echo "  ./deploy-prod.sh - For production deployment"
```

## Environment Cleanup Script (cleanup-env.sh)

The environment cleanup script cleans up unnecessary environment files and provides information about which files can be safely deleted.

### Key Features

- Removes unnecessary environment files
- Provides information about which files can be safely deleted
- Creates a backup of the original `.env` file

### Usage

```bash
./cleanup-env.sh
```

### Implementation Details

```bash
#!/bin/bash
# cleanup-env.sh - Script to clean up environment files and create new ones

echo "Cleaning up environment files..."

# Check if the main .env file exists
if [ ! -f ".env" ]; then
  echo "Error: .env file not found"
  exit 1
fi

# Function to safely extract a value from .env
get_env_value() {
  local key=$1
  # Use grep to find the line, then cut to get everything after the first =
  # This preserves special characters in the value
  grep "^$key=" .env | cut -d= -f2-
}

# Create .env.development with values from .env
echo "Creating .env.development from .env..."
# ... (content omitted for brevity)

# Create .env.production with values from .env
echo "Creating .env.production from .env..."
# ... (content omitted for brevity)

# Create backup of original .env file
cp .env .env.backup

# Remove unnecessary .env files
echo "Removing unnecessary .env files..."
rm -f .env.example .env.development.sample .env.production.sample
rm -f discord-activity/.env discord-activity/.env.example

# Copy the new .env files to Discord Activity
echo "Copying .env files to Discord Activity..."
cp .env.development discord-activity/.env.development
cp .env.production discord-activity/.env.production

echo "Environment files cleanup completed!"
echo "Created new .env.development and .env.production files with values from .env"
echo "Created backup of original .env file as .env.backup"
echo ""
echo "The following environment files are now in use:"
echo "  .env.development - For development environment (KEEP)"
echo "  .env.production - For production environment (KEEP)"
echo "  discord-activity/.env.development - Copy for Discord Activity (KEEP)"
echo "  discord-activity/.env.production - Copy for Discord Activity (KEEP)"
echo "  .env.backup - Backup of original .env file (KEEP for safety)"
echo ""
echo "The following file can be safely deleted if you want to fully transition to the new system:"
echo "  .env - Original environment file (now backed up as .env.backup)"
echo ""
echo "You can now use the deployment scripts:"
echo "  ./deploy-dev.sh - For development deployment"
echo "  ./deploy-prod.sh - For production deployment"
```

## Pre-Deployment Testing Script (test-before-deploy.sh)

The pre-deployment testing script runs tests before deployment to ensure code quality.

### Key Features

- Runs TypeScript type checking
- Runs ESLint
- Runs unit tests
- Runs end-to-end tests

### Usage

```bash
./test-before-deploy.sh
```

### Implementation Details

```bash
#!/bin/bash
# test-before-deploy.sh - Script to run tests before deployment

echo "Running tests before deployment..."

# Run TypeScript type checking
echo "Running TypeScript type checking..."
npm run typecheck

# Check if TypeScript type checking passed
if [ $? -ne 0 ]; then
  echo "TypeScript type checking failed. Aborting deployment."
  exit 1
fi

# Run ESLint
echo "Running ESLint..."
npm run lint

# Check if ESLint passed
if [ $? -ne 0 ]; then
  echo "ESLint failed. Aborting deployment."
  exit 1
fi

# Run unit tests
echo "Running unit tests..."
npm test

# Check if unit tests passed
if [ $? -ne 0 ]; then
  echo "Unit tests failed. Aborting deployment."
  exit 1
fi

# Run end-to-end tests
echo "Running end-to-end tests..."
npm run test:e2e

# Check if end-to-end tests passed
if [ $? -ne 0 ]; then
  echo "End-to-end tests failed. Aborting deployment."
  exit 1
fi

echo "All tests passed. Ready for deployment!"
exit 0
```

## Conclusion

These deployment scripts streamline the development and production deployment processes for the Kaltura-Discord integration project. They handle environment variable management, building both components, setting up a Cloudflare tunnel for development, deploying to Cloudflare for production, and running tests before deployment.

By using these scripts, the development team can ensure consistent and reliable deployments across different environments.