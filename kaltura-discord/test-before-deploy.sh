#!/bin/bash
# test-before-deploy.sh - Run tests before deployment

# Set error handling
set -e  # Exit immediately if a command exits with a non-zero status

# Function to print colored output
print_status() {
  local color=$1
  local message=$2
  
  # Colors
  local RED='\033[0;31m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local BLUE='\033[0;34m'
  local NC='\033[0m' # No Color
  
  if [ "$color" = "red" ]; then
    echo -e "${RED}$message${NC}"
  elif [ "$color" = "green" ]; then
    echo -e "${GREEN}$message${NC}"
  elif [ "$color" = "yellow" ]; then
    echo -e "${YELLOW}$message${NC}"
  elif [ "$color" = "blue" ]; then
    echo -e "${BLUE}$message${NC}"
  else
    echo "$message"
  fi
}

# Check if environment file exists
check_env_files() {
  print_status "yellow" "Checking environment files..."
  
  local missing_files=0
  
  if [ ! -f .env ]; then
    print_status "red" "Error: .env file not found"
    print_status "yellow" "A single .env file is required for both components"
    missing_files=$((missing_files+1))
  else
    print_status "green" "✓ .env file found"
    
    # Check if the .env file contains required variables
    local required_vars=("DISCORD_BOT_TOKEN" "DISCORD_CLIENT_ID" "DISCORD_CLIENT_SECRET"
                         "KALTURA_PARTNER_ID" "KALTURA_ADMIN_SECRET" "JWT_SECRET"
                         "DISCORD_APPLICATION_ID" "DISCORD_ACTIVITY_URL"
                         "API_GATEWAY_URL" "ENABLE_API_GATEWAY")
    
    local missing_vars=0
    for var in "${required_vars[@]}"; do
      if ! grep -q "^$var=" .env; then
        print_status "yellow" "⚠ $var is missing from .env file"
        missing_vars=$((missing_vars+1))
      fi
    done
    
    if [ $missing_vars -gt 0 ]; then
      print_status "yellow" "⚠ $missing_vars required environment variables are missing"
    else
      print_status "green" "✓ All required environment variables are present"
    fi
  fi
  
  # Check if symbolic link exists in discord-activity directory
  if [ -d discord-activity ]; then
    if [ ! -f discord-activity/.env ] && [ ! -L discord-activity/.env ]; then
      print_status "yellow" "⚠ No .env file or symbolic link found in discord-activity directory"
      print_status "yellow" "Consider creating a symbolic link: ln -s ../.env discord-activity/.env"
    elif [ -L discord-activity/.env ]; then
      print_status "green" "✓ Symbolic link to .env found in discord-activity directory"
    else
      print_status "yellow" "⚠ .env file in discord-activity directory is not a symbolic link"
      print_status "yellow" "Consider using a symbolic link for better maintainability"
    fi
  fi
  
  return $missing_files
}

# Run ESLint
run_eslint() {
  print_status "yellow" "Running ESLint..."
  
  if command -v eslint &> /dev/null; then
    if eslint src/ --quiet; then
      print_status "green" "✓ ESLint passed"
      return 0
    else
      print_status "red" "✗ ESLint failed"
      return 1
    fi
  else
    print_status "yellow" "ESLint not found, skipping"
    return 0
  fi
}

# Check TypeScript compilation
check_typescript() {
  print_status "yellow" "Checking TypeScript compilation..."
  
  if command -v tsc &> /dev/null; then
    if tsc --noEmit; then
      print_status "green" "✓ TypeScript compilation passed"
      return 0
    else
      print_status "red" "✗ TypeScript compilation failed"
      return 1
    fi
  else
    print_status "yellow" "TypeScript compiler not found, skipping"
    return 0
  fi
}

# Run unit tests
run_unit_tests() {
  print_status "yellow" "Running unit tests..."
  
  if [ -f package.json ] && grep -q '"test"' package.json; then
    if npm test; then
      print_status "green" "✓ Unit tests passed"
      return 0
    else
      print_status "red" "✗ Unit tests failed"
      return 1
    fi
  else
    print_status "yellow" "No test script found in package.json, skipping"
    return 0
  fi
}

# Run end-to-end tests
run_e2e_tests() {
  print_status "yellow" "Running end-to-end tests..."
  
  if [ -f package.json ] && grep -q '"test:e2e"' package.json; then
    if npm run test:e2e; then
      print_status "green" "✓ End-to-end tests passed"
      return 0
    else
      print_status "red" "✗ End-to-end tests failed"
      return 1
    fi
  else
    print_status "yellow" "No test:e2e script found in package.json, skipping"
    return 0
  fi
}

# Check for security vulnerabilities
check_security() {
  print_status "yellow" "Checking for security vulnerabilities..."
  
  if command -v npm &> /dev/null; then
    npm audit --production
    local audit_status=$?
    
    if [ $audit_status -eq 0 ]; then
      print_status "green" "✓ No security vulnerabilities found"
      return 0
    else
      print_status "yellow" "⚠ Security vulnerabilities found"
      print_status "yellow" "Run 'npm audit fix' to fix them"
      # Don't fail the build for security warnings, just notify
      return 0
    fi
  else
    print_status "yellow" "npm not found, skipping security check"
    return 0
  fi
}

# Check for outdated packages
check_outdated() {
  print_status "yellow" "Checking for outdated packages..."
  
  if command -v npm &> /dev/null; then
    npm outdated || true
    print_status "yellow" "⚠ Consider updating outdated packages"
    return 0
  else
    print_status "yellow" "npm not found, skipping outdated check"
    return 0
  fi
}

# Check Discord Activity build
check_discord_activity() {
  print_status "yellow" "Checking Discord Activity build..."
  
  if [ -d discord-activity ]; then
    cd discord-activity
    
    if command -v pnpm &> /dev/null; then
      if pnpm run build:prod; then
        print_status "green" "✓ Discord Activity build passed"
        cd ..
        return 0
      else
        print_status "red" "✗ Discord Activity build failed"
        cd ..
        return 1
      fi
    else
      print_status "yellow" "pnpm not found, skipping Discord Activity build check"
      cd ..
      return 0
    fi
  else
    print_status "yellow" "Discord Activity directory not found, skipping"
    return 0
  fi
}

# Check Discord Activity SDK alignment
check_discord_activity_sdk() {
  print_status "yellow" "Checking Discord Activity SDK alignment..."
  
  if [ -d discord-activity ]; then
    local sdk_issues=0
    
    # Check for proper SDK import
    if grep -q "@discord/embedded-app-sdk" discord-activity/packages/client/package.json; then
      print_status "green" "✓ Discord Embedded App SDK dependency found"
    else
      print_status "red" "✗ Discord Embedded App SDK dependency not found"
      print_status "yellow" "Add @discord/embedded-app-sdk to discord-activity/packages/client/package.json"
      sdk_issues=$((sdk_issues+1))
    fi
    
    # Check for SDK initialization in client code
    if [ -f discord-activity/packages/client/src/discordSdk.ts ]; then
      if grep -q "discordSdk.ready" discord-activity/packages/client/src/discordSdk.ts; then
        print_status "green" "✓ Discord SDK initialization found"
      else
        print_status "yellow" "⚠ Discord SDK initialization may not follow official patterns"
        print_status "yellow" "Check discord.ready() implementation in discordSdk.ts"
        sdk_issues=$((sdk_issues+1))
      fi
      
      # Check for event subscriptions
      if grep -q "discordSdk.subscribe" discord-activity/packages/client/src/discordSdk.ts; then
        print_status "green" "✓ Discord SDK event subscriptions found"
      else
        print_status "yellow" "⚠ Discord SDK event subscriptions may be missing"
        print_status "yellow" "Check for discord.subscribe() calls in discordSdk.ts"
        sdk_issues=$((sdk_issues+1))
      fi
    else
      print_status "yellow" "⚠ Discord SDK implementation file not found at expected location"
      sdk_issues=$((sdk_issues+1))
    fi
    
    # Check for participant management
    if [ -f discord-activity/packages/client/src/syncService.ts ]; then
      if grep -q "getParticipants" discord-activity/packages/client/src/syncService.ts ||
         grep -q "getParticipants" discord-activity/packages/client/src/discordSdk.ts ||
         grep -q "getActivityParticipants" discord-activity/packages/client/src/discordSdk.ts; then
        print_status "green" "✓ SDK-based participant management found"
      else
        print_status "yellow" "⚠ SDK-based participant management may be missing"
        print_status "yellow" "Consider using discord.activities.getParticipants() for participant tracking"
        sdk_issues=$((sdk_issues+1))
      fi
    fi
    
    # Check for mobile compatibility
    if [ -f discord-activity/packages/client/src/style.css ]; then
      if grep -q "@media.*mobile\|@media.*max-width" discord-activity/packages/client/src/style.css; then
        print_status "green" "✓ Mobile-specific CSS found"
      else
        print_status "yellow" "⚠ Mobile-specific CSS may be missing"
        print_status "yellow" "Consider adding mobile-specific styles for better compatibility"
        sdk_issues=$((sdk_issues+1))
      fi
    fi
    
    if [ $sdk_issues -gt 0 ]; then
      print_status "yellow" "⚠ $sdk_issues potential Discord Activity SDK alignment issues found"
      print_status "yellow" "Review the Discord Activity implementation against official documentation"
      return 1
    else
      print_status "green" "✓ Discord Activity SDK alignment checks passed"
      return 0
    fi
  else
    print_status "yellow" "Discord Activity directory not found, skipping SDK alignment check"
    return 0
  fi
}

# Check Discord Activity URL configuration
check_discord_activity_url() {
  print_status "yellow" "Checking Discord Activity URL configuration..."
  
  # Check if DISCORD_ACTIVITY_URL is set in .env
  if [ -f .env ] && grep -q "^DISCORD_ACTIVITY_URL=" .env; then
    print_status "green" "✓ DISCORD_ACTIVITY_URL is set in .env file"
    
    # Check if the URL is used in the code
    if grep -q "DISCORD_ACTIVITY_URL" src/discord/kalturaActivity.ts 2>/dev/null ||
       grep -q "DISCORD_ACTIVITY_URL" dist/discord/kalturaActivity.js 2>/dev/null; then
      print_status "green" "✓ DISCORD_ACTIVITY_URL is used in the code"
      return 0
    else
      print_status "yellow" "⚠ DISCORD_ACTIVITY_URL may not be properly used in the code"
      print_status "yellow" "Check src/discord/kalturaActivity.ts for proper environment variable usage"
      return 1
    fi
  else
    print_status "yellow" "⚠ DISCORD_ACTIVITY_URL is not set in .env file"
    print_status "yellow" "Add DISCORD_ACTIVITY_URL to .env file"
    return 1
  fi
}
# Check user presence components
check_user_presence_components() {
  print_status "yellow" "Checking user presence components..."
  
  local presence_issues=0
  
  # Check for UserPresence interface
  if [ -f discord-activity/packages/client/src/types/userPresence.ts ]; then
    print_status "green" "✓ UserPresence interface file found"
    
    # Check for required types
    if grep -q "NetworkQuality" discord-activity/packages/client/src/types/userPresence.ts; then
      print_status "green" "✓ NetworkQuality type found"
    else
      print_status "yellow" "⚠ NetworkQuality type may be missing"
      presence_issues=$((presence_issues+1))
    fi
    
    if grep -q "SyncMetrics" discord-activity/packages/client/src/types/userPresence.ts; then
      print_status "green" "✓ SyncMetrics type found"
    else
      print_status "yellow" "⚠ SyncMetrics type may be missing"
      presence_issues=$((presence_issues+1))
    fi
  else
    print_status "yellow" "⚠ UserPresence interface file not found"
    presence_issues=$((presence_issues+1))
  fi
  
  # Check for UI components
  if [ -f discord-activity/packages/client/src/components/NetworkIndicator.ts ]; then
    print_status "green" "✓ NetworkIndicator component found"
  else
    print_status "yellow" "⚠ NetworkIndicator component may be missing"
    presence_issues=$((presence_issues+1))
  fi
  
  if [ -f discord-activity/packages/client/src/components/UserPresenceDisplay.ts ]; then
    print_status "green" "✓ UserPresenceDisplay component found"
  else
    print_status "yellow" "⚠ UserPresenceDisplay component may be missing"
    presence_issues=$((presence_issues+1))
  fi
  
  if [ $presence_issues -gt 0 ]; then
    print_status "yellow" "⚠ $presence_issues potential user presence implementation issues found"
    return 1
  else
    print_status "green" "✓ User presence components check passed"
    return 0
  fi
}

# Check API Gateway integration
check_api_gateway() {
  print_status "yellow" "Checking API Gateway integration..."
  
  local api_issues=0
  
  # Check for API client
  if [ -f discord-activity/packages/server/src/services/apiClient.ts ]; then
    print_status "green" "✓ API client found"
  else
    print_status "yellow" "⚠ API client may be missing"
    api_issues=$((api_issues+1))
  fi
  
  # Check for API Gateway integration in KalturaService
  if [ -f discord-activity/packages/server/src/services/kalturaService.ts ]; then
    if grep -q "apiClient" discord-activity/packages/server/src/services/kalturaService.ts; then
      print_status "green" "✓ API Gateway integration found in KalturaService"
    else
      print_status "yellow" "⚠ API Gateway integration may be missing in KalturaService"
      api_issues=$((api_issues+1))
    fi
  else
    print_status "yellow" "⚠ KalturaService file not found"
    api_issues=$((api_issues+1))
  fi
  
  if [ $api_issues -gt 0 ]; then
    print_status "yellow" "⚠ $api_issues potential API Gateway integration issues found"
    return 1
  else
    print_status "green" "✓ API Gateway integration check passed"
    return 0
  fi
}

# Main function
main() {
  print_status "blue" "Running pre-deployment tests for Kaltura-Discord Integration..."
  print_status "blue" "This script checks code quality, builds, and configuration before deployment"
  echo ""
  
  local failed=0
  
  # Run all checks
  check_env_files || failed=$((failed+1))
  run_eslint || failed=$((failed+1))
  check_typescript || failed=$((failed+1))
  run_unit_tests || failed=$((failed+1))
  run_e2e_tests || failed=$((failed+1))
  check_security
  check_outdated
  check_discord_activity || failed=$((failed+1))
  check_discord_activity_sdk || failed=$((failed+1))
  check_discord_activity_url || failed=$((failed+1))
  check_user_presence_components || failed=$((failed+1))
  check_api_gateway || failed=$((failed+1))
  check_discord_activity_url || failed=$((failed+1))
  
  # Print summary
  echo ""
  if [ $failed -eq 0 ]; then
    print_status "green" "✅ All tests passed! Ready for deployment."
    return 0
  else
    print_status "red" "❌ $failed test(s) failed. Please fix the issues before deploying."
    return 1
  fi
}

# Run the main function
main