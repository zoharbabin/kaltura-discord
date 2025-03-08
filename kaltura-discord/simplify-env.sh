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