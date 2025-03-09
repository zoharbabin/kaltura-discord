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

# Test 1: Health endpoints
print_header "Testing Health Endpoints"
call_api "GET" "/health" "" "" "Basic health check"
call_api "GET" "/api/health" "" "" "API health check"
call_api "GET" "/api/gateway/health" "" "" "API Gateway health check"

# Test 2: Generate authentication token
print_header "Testing Authentication Endpoints"
call_api "POST" "/api/auth/token" "Content-Type: application/json" \
  '{"discordId": "test_user", "username": "Test User", "roles": ["user"]}' \
  "Generate authentication token"

# Extract token using jq
TOKEN=$(echo "$RESPONSE" | jq -r '.token')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  print_success "Authentication token received: ${TOKEN:0:20}..."
  AUTH_HEADER="Authorization: Bearer $TOKEN"
else
  print_info "Could not extract token from response, using fallback token"
  # Continue anyway for testing other endpoints
  # Create a properly formatted JWT token for testing
  TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkaXNjb3JkSWQiOiJ0ZXN0X3VzZXIiLCJrYWx0dXJhVXNlcklkIjoidGVzdF91c2VyIiwiaWF0IjoxNjE2MTYyMDAwLCJleHAiOjk5OTk5OTk5OTl9.test_signature"
  AUTH_HEADER="Authorization: Bearer $TOKEN"
fi


# Test 3: Get video details
print_header "Testing Video Endpoints"
call_api "GET" "/api/videos/1_noembdcg" "$AUTH_HEADER" "" \
  "Get video details for ID: 1_noembdcg"

# Extract video ID using jq
VIDEO_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ -n "$VIDEO_ID" ] && [ "$VIDEO_ID" != "null" ]; then
  print_success "Video details retrieved for ID: $VIDEO_ID"
else
  print_info "Could not extract video ID, using '1_noembdcg' for subsequent tests"
  VIDEO_ID="1_noembdcg"
fi

# Test 4: List all videos
call_api "GET" "/api/videos" "$AUTH_HEADER" "" \
  "List all videos"

# Test 5: Search videos
call_api "GET" "/api/videos/search?query=test" "$AUTH_HEADER" "" \
  "Search for videos with query 'test'"

# Test 6: Generate play URL for a video
call_api "POST" "/api/videos/1_noembdcg/play" "$AUTH_HEADER" "" \
  "Generate play URL for video ID: 1_noembdcg"

# Test 7: User presence features
print_header "Testing User Presence Features"
call_api "GET" "/api/presence/users" "$AUTH_HEADER" "" "Get all user presences"

# Test 8: User presence update
call_api "POST" "/api/presence/update" "$AUTH_HEADER" \
  '{"status": "active", "playbackState": {"isPlaying": true, "currentTime": 120}}' \
  "Update user presence"

# Test 9: Network quality update
call_api "POST" "/api/presence/network" "$AUTH_HEADER" \
  '{"userId": "test_user", "quality": "good"}' \
  "Update network quality"

# Test 10: Synchronization features
print_header "Testing Synchronization Features"
call_api "POST" "/api/sync/request" "$AUTH_HEADER" \
  '{"requesterId": "test_user"}' \
  "Request synchronization"

# Test 11: Broadcast playback state
call_api "POST" "/api/sync/broadcast" "$AUTH_HEADER" \
  '{"playbackState": {"isPlaying": true, "currentTime": 120, "timestamp": '"$(date +%s)"'}}' \
  "Broadcast playback state"

# Test 12: Get sync metrics
call_api "GET" "/api/sync/metrics" "$AUTH_HEADER" "" "Get synchronization metrics"

# Summary
print_header "Test Summary"
echo "All API endpoints have been tested against $BASE_URL"
echo "For detailed results, review the output above."

exit 0