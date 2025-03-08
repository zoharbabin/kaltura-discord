#!/bin/bash
# consolidate-env.sh - Script to consolidate environment variables

# Function to display usage information
show_usage() {
  echo "Usage: ./consolidate-env.sh [dev|prod]"
  echo "  dev  - Consolidate development environment files"
  echo "  prod - Consolidate production environment files"
}

# Check if an argument was provided
if [ $# -ne 1 ]; then
  show_usage
  exit 1
fi

# Set environment based on argument
ENV=$1
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  show_usage
  exit 1
fi

# Set file names based on environment
if [ "$ENV" = "dev" ]; then
  MAIN_ENV=".env.development"
  ACTIVITY_ENV="discord-activity/.env.development"
  CONSOLIDATED_ENV=".env.development.consolidated"
else
  MAIN_ENV=".env.production"
  ACTIVITY_ENV="discord-activity/.env.production"
  CONSOLIDATED_ENV=".env.production.consolidated"
fi

# Check if the main environment file exists
if [ ! -f "$MAIN_ENV" ]; then
  echo "Error: $MAIN_ENV file not found"
  exit 1
fi

# Create consolidated environment file
echo "# Consolidated environment file for $ENV environment" > "$CONSOLIDATED_ENV"
echo "# Created on $(date)" >> "$CONSOLIDATED_ENV"
echo "" >> "$CONSOLIDATED_ENV"

# Add main environment variables
echo "# Main Discord Bot Environment Variables" >> "$CONSOLIDATED_ENV"
cat "$MAIN_ENV" >> "$CONSOLIDATED_ENV"
echo "" >> "$CONSOLIDATED_ENV"

# Add Discord Activity specific variables if they exist and aren't already in the main file
if [ -f "$ACTIVITY_ENV" ]; then
  echo "# Discord Activity Specific Environment Variables" >> "$CONSOLIDATED_ENV"
  echo "# (Only variables not already defined in the main section)" >> "$CONSOLIDATED_ENV"
  
  # Read each line from the activity env file
  while IFS= read -r line; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
      continue
    fi
    
    # Extract variable name (before the = sign)
    var_name=$(echo "$line" | cut -d= -f1)
    
    # Check if this variable is already in the main env file
    if ! grep -q "^$var_name=" "$MAIN_ENV"; then
      echo "$line" >> "$CONSOLIDATED_ENV"
    fi
  done < "$ACTIVITY_ENV"
fi

echo "" >> "$CONSOLIDATED_ENV"
echo "# End of consolidated environment file" >> "$CONSOLIDATED_ENV"

# Create backup of original files
cp "$MAIN_ENV" "${MAIN_ENV}.bak"
if [ -f "$ACTIVITY_ENV" ]; then
  cp "$ACTIVITY_ENV" "${ACTIVITY_ENV}.bak"
fi

# Replace original files with the consolidated one
cp "$CONSOLIDATED_ENV" "$MAIN_ENV"
cp "$CONSOLIDATED_ENV" "$ACTIVITY_ENV"

# Remove the temporary consolidated file
rm "$CONSOLIDATED_ENV"

echo "Environment files have been consolidated!"
echo "Backups of the original files were created as ${MAIN_ENV}.bak and ${ACTIVITY_ENV}.bak"
echo ""
echo "Now you only need to edit $MAIN_ENV, and the deployment scripts will"
echo "automatically copy it to the Discord Activity component as needed."