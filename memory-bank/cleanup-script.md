# Kaltura-Discord Integration Cleanup Script

This document contains the cleanup script that can be used to remove redundant, unused, or no longer relevant files in the Kaltura-Discord integration project.

## Cleanup Script

```bash
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
read -p "Do you want to clean generated files (coverage/ and dist/ directories)? (y/n): " clean_generated
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
```

## Usage Instructions

1. Save the above script as `cleanup-project.sh` in the root directory of the project.
2. Make the script executable:
   ```bash
   chmod +x cleanup-project.sh
   ```
3. Run the script:
   ```bash
   ./cleanup-project.sh
   ```
4. Follow the prompts to complete the cleanup process.
5. Verify that the project still builds and functions correctly after cleanup.

## Verification Steps

After running the cleanup script, verify that:

1. The project can still be built successfully:
   ```bash
   npm run build
   ```
2. The deployment scripts still work correctly:
   ```bash
   ./deploy-dev.sh
   ```
3. The environment variables are correctly loaded in both the main project and the Discord Activity component.
4. All tests pass successfully:
   ```bash
   npm test
   ```

If any issues are encountered, you can restore the project from the backup created by the script.