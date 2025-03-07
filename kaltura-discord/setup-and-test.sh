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

if [ $ENV_ISSUES -eq 1 ]; then
  echo -e "\n${YELLOW}Some environment variables are not properly set.${RESET}"
  echo -e "${YELLOW}The application will run in development mode with mock responses.${RESET}"
else
  echo -e "\n${GREEN}All environment variables are properly set.${RESET}"
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
fi

echo -e "\n${BOLD}Setup and test completed.${RESET}"