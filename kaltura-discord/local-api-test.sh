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
call_api "GET" "/health" "" "" "Health check"

# Test 2: Generate authentication token
print_header "Testing Authentication Endpoints"
call_api "POST" "/api/auth/token" "Content-Type: application/json" \
  '{"discordId": "123456789", "username": "TestUser", "roles": ["admin"]}' \
  "Generate authentication token"

# Extract token using jq
TOKEN=$(echo "$RESPONSE" | jq -r '.token')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  print_success "Authentication token received: ${TOKEN:0:20}..."
  AUTH_HEADER="Authorization: Bearer $TOKEN"
else
  print_error "Failed to get authentication token"
  echo "Response was: $RESPONSE"
  exit 1
fi

# Test 3: Validate token
call_api "POST" "/api/auth/validate" "Content-Type: application/json" \
  '{"token": "'$TOKEN'"}' \
  "Validate authentication token"

# Test 4: Refresh token
call_api "POST" "/api/auth/refresh" "Content-Type: application/json" \
  '{"token": "'$TOKEN'"}' \
  "Refresh authentication token"

# Test 5: Create a meeting
print_header "Testing Meeting Endpoints"
call_api "POST" "/api/meetings" "$AUTH_HEADER" \
  '{"title": "Test Meeting", "description": "This is a test meeting", "type": "webinar"}' \
  "Create a new meeting"

# Extract meeting ID using jq
MEETING_ID=$(echo "$RESPONSE" | jq -r '.meeting.id')

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ]; then
  print_success "Meeting created with ID: $MEETING_ID"
else
  print_info "Could not extract meeting ID, using 'default_value' for subsequent tests"
  MEETING_ID="default_value"
fi

# Test 6: List all meetings
call_api "GET" "/api/meetings" "$AUTH_HEADER" "" \
  "List all meetings"

# Test 7: Get specific meeting
call_api "GET" "/api/meetings/$MEETING_ID" "$AUTH_HEADER" "" \
  "Get meeting details for ID: $MEETING_ID"

# Test 8: Generate join URL
call_api "POST" "/api/meetings/$MEETING_ID/join" "$AUTH_HEADER" "" \
  "Generate join URL for meeting ID: $MEETING_ID"

# Test 9: End meeting
call_api "DELETE" "/api/meetings/$MEETING_ID" "$AUTH_HEADER" "" \
  "End meeting with ID: $MEETING_ID"

# Test video-related endpoints
print_header "Testing Video Endpoints"

# Test 10: Search videos
call_api "GET" "/api/videos/search?q=test&limit=5" "$AUTH_HEADER" "" \
  "Search for videos with query 'test'"

# Test 11: Get video details
call_api "GET" "/api/videos/default_video_id" "$AUTH_HEADER" "" \
  "Get video details"

# Test 12: Generate video play URL
call_api "POST" "/api/videos/default_video_id/play" "$AUTH_HEADER" "" \
  "Generate play URL for video"

# Test 13: Check Kaltura video endpoint
call_api "GET" "/api/kaltura/video/1_noembdcg" "$AUTH_HEADER" "" \
  "Get Kaltura video details"

# Summary
print_header "Test Summary"
echo "All API endpoints have been tested against $BASE_URL"
echo "For detailed results, review the output above."

exit 0