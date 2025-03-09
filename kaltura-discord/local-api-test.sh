#!/bin/bash

# local-api-test.sh - Test script for Kaltura-Discord API endpoints
# Usage: ./local-api-test.sh [domain] [port] [protocol]
# Example: ./local-api-test.sh localhost 3000 http

# Default values
DOMAIN=${1:-localhost}
PORT=${2:-3000}
PROTOCOL=${3:-http}
BASE_URL="$PROTOCOL://$DOMAIN:$PORT"
TOKEN=""
MEETING_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error messages
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to print info messages
print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# Global variable to store the last response
RESPONSE=""

# Function to make API calls and handle responses
call_api() {
  local method=$1
  local endpoint=$2
  local headers=$3
  local data=$4
  local description=$5

  echo -e "\n${YELLOW}Testing: $description${NC}"
  
  # Build the curl command
  local curl_cmd="curl -s -X $method \"$BASE_URL$endpoint\""
  
  # Add headers if provided
  if [ -n "$headers" ]; then
    curl_cmd="$curl_cmd -H \"Content-Type: application/json\""
    
    # Add Authorization header if it exists
    if [[ "$headers" == *"Authorization:"* ]]; then
      local auth_token=$(echo "$headers" | grep -o "Authorization: Bearer [^ ]*")
      curl_cmd="$curl_cmd -H \"$auth_token\""
    fi
  fi
  
  # Add data if provided
  if [ -n "$data" ]; then
    curl_cmd="$curl_cmd -d '$data'"
  fi
  
  echo "$ $curl_cmd"
  
  # Execute the curl command and capture output
  RESPONSE=$(eval $curl_cmd)
  
  # Check if the response is valid JSON
  if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo -e "${GREEN}Response:${NC}"
    echo "$RESPONSE" | jq .
    return 0
  else
    echo -e "${RED}Error: Invalid JSON response${NC}"
    echo "$RESPONSE"
    return 1
  fi
}

# Main script execution
echo "Kaltura-Discord API Test Script"
echo "Testing API at $BASE_URL"
echo "Usage: $0 [domain] [port] [protocol]"
echo "Example: $0 localhost 3000 https"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  print_error "jq is not installed. Please install it to parse JSON responses."
  echo "On macOS: brew install jq"
  echo "On Ubuntu/Debian: apt-get install jq"
  exit 1
fi

# Test 1: Health endpoint
print_header "Testing Health Endpoint"
call_api "GET" "/api/health" "" "" "Health check"

# Test 2: Generate authentication token
print_header "Testing Authentication Endpoints"
call_api "POST" "/api/token" "Content-Type: application/json" \
  '{"code": "test_code"}' \
  "Generate Discord token (expected to fail with test code)"

# Extract access_token using jq
TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  print_success "Discord token received: ${TOKEN:0:20}..."
  AUTH_HEADER="Authorization: Bearer $TOKEN"
else
  print_info "Expected error: The 'invalid_client' error is normal when testing with a dummy code"
  print_info "In a real scenario, this endpoint requires a valid Discord OAuth2 authorization code"
  # Continue anyway for testing other endpoints
  TOKEN="test_token"
  AUTH_HEADER="Authorization: Bearer $TOKEN"
fi

# Test 3: Generate Kaltura session
call_api "POST" "/api/kaltura/session" "Content-Type: application/json" \
  '{"videoId": "1_noembdcg", "userId": "test_user"}' \
  "Generate Kaltura session"

# Extract KS using jq
KS=$(echo "$RESPONSE" | jq -r '.ks')

if [ -n "$KS" ] && [ "$KS" != "null" ]; then
  print_success "Kaltura session received: ${KS:0:20}..."
else
  print_info "Could not extract Kaltura session, using default for subsequent tests"
  KS="test_ks"
fi

# Test 5: Get video details
print_header "Testing Video Endpoints"
call_api "GET" "/api/kaltura/video/1_noembdcg" "$AUTH_HEADER" "" \
  "Get video details for ID: 1_noembdcg"

# Extract video ID using jq
VIDEO_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ -n "$VIDEO_ID" ] && [ "$VIDEO_ID" != "null" ]; then
  print_success "Video details retrieved for ID: $VIDEO_ID"
else
  print_info "Could not extract video ID, using '1_noembdcg' for subsequent tests"
  VIDEO_ID="1_noembdcg"
fi

# Test 6: List all videos
call_api "GET" "/api/kaltura/videos" "$AUTH_HEADER" "" \
  "List all videos"

# Test 7: Search videos
call_api "GET" "/api/kaltura/videos/search?query=test" "$AUTH_HEADER" "" \
  "Search for videos with query 'test'"

# No additional video endpoints to test

# Summary
print_header "Test Summary"
echo "All API endpoints have been tested against $BASE_URL"
echo "For detailed results, review the output above."

exit 0