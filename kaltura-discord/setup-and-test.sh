#!/bin/bash

# Setup and Test Script for Kaltura-Discord Integration
# This script helps set up the environment and test the integration

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"

echo -e "${BOLD}Kaltura-Discord Integration Setup and Test${RESET}\n"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}No .env file found. Creating one from .env.example...${RESET}"
  cp .env.example .env
  echo -e "${GREEN}Created .env file. Please edit it with your actual credentials.${RESET}"
else
  echo -e "${GREEN}Found existing .env file.${RESET}"
fi

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo -e "\n${BOLD}Checking required tools...${RESET}"

if ! command_exists node; then
  echo -e "${RED}Node.js is not installed. Please install Node.js v18 or higher.${RESET}"
  exit 1
else
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}Node.js is installed: $NODE_VERSION${RESET}"
fi

if ! command_exists npm; then
  echo -e "${RED}npm is not installed. Please install npm.${RESET}"
  exit 1
else
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}npm is installed: $NPM_VERSION${RESET}"
fi

# Check for pnpm (required for Discord Activity)
if ! command_exists pnpm; then
  echo -e "${YELLOW}pnpm is not installed. It's required for Discord Activity.${RESET}"
  echo -e "${YELLOW}Would you like to install pnpm? (y/n)${RESET}"
  read -r INSTALL_PNPM
  
  if [[ $INSTALL_PNPM =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Installing pnpm...${RESET}"
    npm install -g pnpm
    if [ $? -ne 0 ]; then
      echo -e "${RED}Failed to install pnpm. Please install it manually.${RESET}"
      echo -e "${RED}Discord Activity setup will be skipped.${RESET}"
      SKIP_ACTIVITY=true
    else
      echo -e "${GREEN}pnpm installed successfully.${RESET}"
    fi
  else
    echo -e "${YELLOW}Skipping pnpm installation. Discord Activity setup will be skipped.${RESET}"
    SKIP_ACTIVITY=true
  fi
else
  PNPM_VERSION=$(pnpm -v)
  echo -e "${GREEN}pnpm is installed: $PNPM_VERSION${RESET}"
fi

# Check for cloudflared (optional for Discord Activity local development)
if ! command_exists cloudflared; then
  echo -e "${YELLOW}cloudflared is not installed. It's recommended for Discord Activity local development.${RESET}"
  echo -e "${YELLOW}You can install it later if needed.${RESET}"
else
  CLOUDFLARED_VERSION=$(cloudflared --version | head -n 1)
  echo -e "${GREEN}cloudflared is installed: $CLOUDFLARED_VERSION${RESET}"
fi

# Install dependencies
echo -e "\n${BOLD}Installing dependencies...${RESET}"
npm install
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to install dependencies.${RESET}"
  exit 1
else
  echo -e "${GREEN}Dependencies installed successfully.${RESET}"
fi

# Build the project
echo -e "\n${BOLD}Building the project...${RESET}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to build the project.${RESET}"
  exit 1
else
  echo -e "${GREEN}Project built successfully.${RESET}"
fi

# Create necessary directories
echo -e "\n${BOLD}Creating necessary directories...${RESET}"
mkdir -p logs
mkdir -p config/overrides
echo -e "${GREEN}Directories created.${RESET}"

# Check if default_config.json exists
if [ ! -f config/default_config.json ]; then
  echo -e "${YELLOW}No default_config.json found. Please make sure it exists.${RESET}"
else
  echo -e "${GREEN}Found default_config.json.${RESET}"
fi

# Check environment variables
echo -e "\n${BOLD}Checking environment variables...${RESET}"

# Use grep and cut to safely extract environment variables instead of sourcing the file
ENV_ISSUES=0

check_env_var() {
  local var_name=$1
  local default_value=$2
  local var_value
  
  # Safely extract the value using grep and cut
  var_value=$(grep "^$var_name=" .env | cut -d= -f2-)
  
  if [ -z "$var_value" ] || [ "$var_value" == "your_$default_value" ]; then
    echo -e "${YELLOW}Warning: $var_name is not set or has default value.${RESET}"
    ENV_ISSUES=1
  else
    echo -e "${GREEN}$var_name is set.${RESET}"
  fi
}

check_env_var "DISCORD_BOT_TOKEN" "discord_bot_token"
check_env_var "DISCORD_CLIENT_ID" "discord_client_id"
check_env_var "DISCORD_CLIENT_SECRET" "discord_client_secret"
check_env_var "KALTURA_PARTNER_ID" "kaltura_partner_id"
check_env_var "KALTURA_ADMIN_SECRET" "kaltura_admin_secret"
check_env_var "JWT_SECRET" "jwt_secret"
check_env_var "DISCORD_APPLICATION_ID" "discord_application_id"

if [ $ENV_ISSUES -eq 1 ]; then
  echo -e "\n${YELLOW}Some environment variables are not properly set.${RESET}"
  echo -e "${YELLOW}The application will run in development mode with mock responses.${RESET}"
else
  echo -e "\n${GREEN}All environment variables are properly set.${RESET}"
fi

# Setup Discord Activity
if [ "$SKIP_ACTIVITY" != "true" ]; then
  echo -e "\n${BOLD}Discord Activity Setup${RESET}"
  echo -e "${BLUE}This step will set up the Discord Activity for Watch Together feature.${RESET}"
  echo -e "${BLUE}Would you like to set up the Discord Activity? (y/n)${RESET}"
  read -r SETUP_ACTIVITY
  
  if [[ $SETUP_ACTIVITY =~ ^[Yy]$ ]]; then
    echo -e "\n${BOLD}Setting up Discord Activity...${RESET}"
    
    # Check if Discord Activity .env file exists
    if [ ! -f discord-activity/.env ]; then
      echo -e "${YELLOW}No .env file found for Discord Activity. Creating one from .env.example...${RESET}"
      cp discord-activity/.env.example discord-activity/.env
      
      # Copy values from main .env file
      DISCORD_CLIENT_ID=$(grep "^DISCORD_CLIENT_ID=" .env | cut -d= -f2-)
      DISCORD_CLIENT_SECRET=$(grep "^DISCORD_CLIENT_SECRET=" .env | cut -d= -f2-)
      KALTURA_PARTNER_ID=$(grep "^KALTURA_PARTNER_ID=" .env | cut -d= -f2-)
      KALTURA_PLAYER_ID=$(grep "^KALTURA_PLAYER_ID=" .env | cut -d= -f2- || echo "46022343")
      
      # Update Discord Activity .env file
      sed -i "s/^VITE_CLIENT_ID=.*/VITE_CLIENT_ID=$DISCORD_CLIENT_ID/" discord-activity/.env
      sed -i "s/^CLIENT_SECRET=.*/CLIENT_SECRET=$DISCORD_CLIENT_SECRET/" discord-activity/.env
      sed -i "s/^VITE_KALTURA_PARTNER_ID=.*/VITE_KALTURA_PARTNER_ID=$KALTURA_PARTNER_ID/" discord-activity/.env
      sed -i "s/^VITE_KALTURA_PLAYER_ID=.*/VITE_KALTURA_PLAYER_ID=$KALTURA_PLAYER_ID/" discord-activity/.env
      
      echo -e "${GREEN}Created and configured Discord Activity .env file.${RESET}"
    else
      echo -e "${GREEN}Found existing Discord Activity .env file.${RESET}"
    fi
    
    # Install Discord Activity dependencies
    echo -e "\n${BOLD}Installing Discord Activity dependencies...${RESET}"
    cd discord-activity && pnpm install
    if [ $? -ne 0 ]; then
      echo -e "${RED}Failed to install Discord Activity dependencies.${RESET}"
      cd ..
    else
      echo -e "${GREEN}Discord Activity root dependencies installed successfully.${RESET}"
      
      # Install client package dependencies
      echo -e "\n${BOLD}Installing Discord Activity client dependencies...${RESET}"
      cd packages/client && pnpm install
      if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install Discord Activity client dependencies.${RESET}"
        cd ../..
      else
        echo -e "${GREEN}Discord Activity client dependencies installed successfully.${RESET}"
        cd ../..
      fi
      
      # Install server package dependencies
      echo -e "\n${BOLD}Installing Discord Activity server dependencies...${RESET}"
      cd packages/server && pnpm install
      if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install Discord Activity server dependencies.${RESET}"
        cd ../..
      else
        echo -e "${GREEN}Discord Activity server dependencies installed successfully.${RESET}"
        cd ../..
      fi
      
      # Build Discord Activity
      echo -e "\n${BOLD}Building Discord Activity...${RESET}"
      pnpm run build
      if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to build Discord Activity.${RESET}"
      else
        echo -e "${GREEN}Discord Activity built successfully.${RESET}"
      fi
      
      cd ..
    fi
    
    # Update configuration to enable Discord Activity
    echo -e "\n${BOLD}Would you like to enable Discord Activity in the configuration? (y/n)${RESET}"
    read -r ENABLE_ACTIVITY
    
    if [[ $ENABLE_ACTIVITY =~ ^[Yy]$ ]]; then
      # Get Discord Application ID
      DISCORD_APP_ID=$(grep "^DISCORD_APPLICATION_ID=" .env | cut -d= -f2-)
      
      if [ -z "$DISCORD_APP_ID" ] || [ "$DISCORD_APP_ID" == "your_discord_application_id" ]; then
        echo -e "${YELLOW}DISCORD_APPLICATION_ID is not set in .env file.${RESET}"
        echo -e "${YELLOW}Please enter your Discord Application ID:${RESET}"
        read -r DISCORD_APP_ID
      fi
      
      # Create a server-specific configuration override
      echo -e "\n${BOLD}Creating server-specific configuration override...${RESET}"
      echo -e "${YELLOW}Please enter the Discord server ID to enable Activities API for:${RESET}"
      read -r SERVER_ID
      
      if [ -n "$SERVER_ID" ]; then
        mkdir -p config/overrides
        
        # Check if server config already exists
        if [ -f "config/overrides/$SERVER_ID.json" ]; then
          # Update existing config
          # This is a simplified approach - in a real scenario, you might want to use jq for proper JSON manipulation
          TMP_FILE=$(mktemp)
          cat "config/overrides/$SERVER_ID.json" | \
            sed 's/"features": {/"features": {\n    "activitiesApi": true,\n    "discordApplicationId": "'$DISCORD_APP_ID'",/' > "$TMP_FILE"
          mv "$TMP_FILE" "config/overrides/$SERVER_ID.json"
        else
          # Create new config
          cat > "config/overrides/$SERVER_ID.json" << EOF
{
  "features": {
    "activitiesApi": true,
    "discordApplicationId": "$DISCORD_APP_ID"
  }
}
EOF
        fi
        
        echo -e "${GREEN}Discord Activity enabled for server $SERVER_ID.${RESET}"
      else
        echo -e "${YELLOW}No server ID provided. Skipping configuration.${RESET}"
      fi
    else
      echo -e "${YELLOW}Skipping Discord Activity configuration. You can enable it later by updating the server configuration.${RESET}"
    fi
  else
    echo -e "${YELLOW}Skipping Discord Activity setup.${RESET}"
  fi
fi

# Test the application
echo -e "\n${BOLD}Running tests...${RESET}"
echo -e "${BLUE}Running end-to-end tests...${RESET}"
npm run test:e2e
if [ $? -ne 0 ]; then
  echo -e "${RED}End-to-end tests failed.${RESET}"
  exit 1
else
  echo -e "${GREEN}End-to-end tests passed successfully.${RESET}"
fi

# Optionally run Jest tests if they exist
echo -e "\n${BLUE}Checking for Jest unit tests...${RESET}"
npm test -- --passWithNoTests
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}Some Jest tests failed or no tests were found. This is expected if you haven't created Jest tests yet.${RESET}"
else
  echo -e "${GREEN}Jest tests passed successfully.${RESET}"
fi

# Setup Discord bot
echo -e "\n${BOLD}Discord Bot Setup${RESET}"
echo -e "${BLUE}This step will help configure your Discord bot and check for required permissions.${RESET}"
echo -e "${BLUE}Would you like to run the Discord bot setup? (y/n)${RESET}"
read -r SETUP_DISCORD

if [[ $SETUP_DISCORD =~ ^[Yy]$ ]]; then
  # Check if required packages are installed
  if ! npm list -g chalk inquirer axios open > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing required packages for Discord bot setup...${RESET}"
    npm install --no-save chalk inquirer axios open
  fi
  
  # Create scripts directory if it doesn't exist
  mkdir -p scripts
  
  # Make the Discord bot setup script executable
  chmod +x scripts/discord-bot-setup.js
  
  # Run the Discord bot setup script
  echo -e "${BLUE}Running Discord bot setup script...${RESET}"
  node scripts/discord-bot-setup.js
  
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Discord bot setup encountered issues. You may need to configure some settings manually.${RESET}"
  else
    echo -e "${GREEN}Discord bot setup completed successfully.${RESET}"
  fi
else
  echo -e "${YELLOW}Skipping Discord bot setup. You can run it later with:${RESET}"
  echo -e "  node scripts/discord-bot-setup.js"
fi

# Start the application in development mode
echo -e "\n${BOLD}Would you like to start the application in development mode? (y/n)${RESET}"
read -r START_APP

if [[ $START_APP =~ ^[Yy]$ ]]; then
  echo -e "\n${BOLD}Starting the application in development mode...${RESET}"
  echo -e "${YELLOW}Press Ctrl+C to stop the application.${RESET}\n"
  npm run dev
else
  echo -e "\n${BOLD}To start the application manually, run:${RESET}"
  echo -e "  npm run dev    # For development mode"
  echo -e "  npm start      # For production mode"
  
  if [ "$SKIP_ACTIVITY" != "true" ]; then
    echo -e "\n${BOLD}To start the Discord Activity, run:${RESET}"
    echo -e "  cd discord-activity && pnpm dev"
    echo -e "  cd discord-activity && pnpm tunnel    # In another terminal for local testing"
  fi
fi

echo -e "\n${BOLD}Setup and test completed.${RESET}"