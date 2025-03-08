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
  local NC='\033[0m' # No Color
  
  if [ "$color" = "red" ]; then
    echo -e "${RED}$message${NC}"
  elif [ "$color" = "green" ]; then
    echo -e "${GREEN}$message${NC}"
  elif [ "$color" = "yellow" ]; then
    echo -e "${YELLOW}$message${NC}"
  else
    echo "$message"
  fi
}

# Check if environment files exist
check_env_files() {
  print_status "yellow" "Checking environment files..."
  
  local missing_files=0
  
  if [ ! -f .env.production ]; then
    print_status "red" "Error: .env.production file not found"
    missing_files=$((missing_files+1))
  else
    print_status "green" "✓ .env.production file found"
  fi
  
  if [ ! -f discord-activity/.env.production ]; then
    print_status "red" "Error: discord-activity/.env.production file not found"
    missing_files=$((missing_files+1))
  else
    print_status "green" "✓ discord-activity/.env.production file found"
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

# Main function
main() {
  print_status "yellow" "Running pre-deployment tests..."
  
  local failed=0
  
  # Run all checks
  check_env_files || failed=$((failed+1))
  run_eslint || failed=$((failed+1))
  check_typescript || failed=$((failed+1))
  run_unit_tests || failed=$((failed+1))
  check_security
  check_outdated
  check_discord_activity || failed=$((failed+1))
  
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