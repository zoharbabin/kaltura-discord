#!/bin/bash
# cleanup-project.sh - Script to remove redundant files from the project

echo "Starting cleanup of redundant files..."

# Create a backup of the entire project
echo "Creating backup of the project..."
BACKUP_DIR="../kaltura-discord-backup-$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR"
echo "Backup created at $BACKUP_DIR"

# Remove redundant environment variable management scripts
echo "Removing redundant environment variable management scripts..."
if [ -f "cleanup-env.sh" ]; then
  rm -f cleanup-env.sh
  echo "Removed cleanup-env.sh"
fi

if [ -f "consolidate-env.sh" ]; then
  rm -f consolidate-env.sh
  echo "Removed consolidate-env.sh"
fi

# Remove redundant environment variable files
echo "Removing redundant environment variable files..."
for env_file in .env.example .env.development.sample .env.production.sample .env.development .env.production; do
  if [ -f "$env_file" ]; then
    rm -f "$env_file"
    echo "Removed $env_file"
  fi
done

# Remove redundant environment variable files in Discord Activity
for env_file in discord-activity/.env.example discord-activity/.env.development discord-activity/.env.production; do
  if [ -f "$env_file" ]; then
    rm -f "$env_file"
    echo "Removed $env_file"
  fi
done

# Optional: Clean generated files
echo "Do you want to clean generated files (coverage/ and dist/ directories)? (y/n): "
read -p "" clean_generated
if [ "$clean_generated" = "y" ] || [ "$clean_generated" = "Y" ]; then
  echo "Cleaning generated files..."
  
  if [ -d "coverage" ]; then
    rm -rf coverage
    echo "Removed coverage/ directory"
  fi
  
  if [ -d "dist" ]; then
    rm -rf dist
    echo "Removed dist/ directory"
  fi
  
  echo "Note: You will need to rebuild the project to regenerate these files."
fi

echo "Cleanup completed successfully!"
echo "Please verify that the project still builds and functions correctly."