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
  grep "^$key=" .env | sed "s/^$key=//"
}

# Create .env.development with values from .env
echo "Creating .env.development from .env..."
cat > .env.development << EOL
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
NODE_ENV=development

# JWT Configuration
JWT_SECRET=$(get_env_value "JWT_SECRET")
JWT_EXPIRY=$(get_env_value "JWT_EXPIRY")

# Logging Configuration
LOG_LEVEL=$(get_env_value "LOG_LEVEL")

# Discord Activity Configuration
DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com

# Discord Activity Client Configuration
VITE_CLIENT_ID=$(get_env_value "DISCORD_CLIENT_ID")
VITE_KALTURA_PARTNER_ID=$(get_env_value "KALTURA_PARTNER_ID")
VITE_KALTURA_PLAYER_ID=$(get_env_value "KALTURA_PLAYER_ID")
VITE_KALTURA_API_ENDPOINT=$(get_env_value "KALTURA_API_ENDPOINT")

# Discord Activity Server Configuration
PORT=3001
PUBLIC_URL=http://localhost:3000
EOL

# Create .env.production with values from .env
echo "Creating .env.production from .env..."
cat > .env.production << EOL
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
NODE_ENV=production

# JWT Configuration
JWT_SECRET=$(get_env_value "JWT_SECRET")
JWT_EXPIRY=$(get_env_value "JWT_EXPIRY")

# Logging Configuration
LOG_LEVEL=$(get_env_value "LOG_LEVEL")

# Discord Activity Configuration
DISCORD_ACTIVITY_URL=https://discord.zoharbabin.com

# Discord Activity Client Configuration
VITE_CLIENT_ID=$(get_env_value "DISCORD_CLIENT_ID")
VITE_KALTURA_PARTNER_ID=$(get_env_value "KALTURA_PARTNER_ID")
VITE_KALTURA_PLAYER_ID=$(get_env_value "KALTURA_PLAYER_ID")
VITE_KALTURA_API_ENDPOINT=$(get_env_value "KALTURA_API_ENDPOINT")

# Discord Activity Server Configuration
PORT=3001
PUBLIC_URL=https://discord.zoharbabin.com
EOL

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