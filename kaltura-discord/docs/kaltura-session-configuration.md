# Kaltura Session Configuration Guide

This guide explains how to configure Kaltura session privileges for different environments and use cases.

## Overview

The Kaltura Discord bot uses different types of Kaltura sessions for different operations:
- Meeting sessions for creating and managing virtual events
- Video sessions for searching and playing VOD content

Each type of session may require specific privileges depending on your Kaltura environment configuration.

## Configuration Options

You can configure session privileges in two ways:

### 1. Environment Variables

Set these variables in your `.env` file:

```
# Kaltura Session Privileges
KALTURA_PRIVACY_CONTEXT=your_privacy_context
KALTURA_VIRTUAL_EVENT_ID=your_virtual_event_id
KALTURA_APP_ID=your_app_id
KALTURA_SEARCH_CONTEXT=your_search_context
```

### 2. Configuration File

Edit the `config/default_config.json` file to set privileges for different session types:

```json
{
  "kaltura": {
    "session": {
      "privileges": {
        "default": "",
        "video": "privacycontext:YOUR_PRIVACY_CONTEXT,searchcontext:YOUR_SEARCH_CONTEXT,setrole:PLAYBACK_BASE_ROLE",
        "meeting": "virtualeventid:YOUR_EVENT_ID,eventsessioncontextid:*,appid:YOUR_APP_ID"
      }
    }
  }
}
```

## Common Privilege Settings

### Video Session Privileges

For VOD functionality, you may need to include:

- `privacycontext:YOUR_PRIVACY_CONTEXT` - The privacy context for your Kaltura account
- `searchcontext:YOUR_SEARCH_CONTEXT` - The search context for eSearch API
- `setrole:PLAYBACK_BASE_ROLE` - Required role for video playback
- `genieid:default` - For recommendation engine integration

### Meeting Session Privileges

For virtual events, you may need:

- `virtualeventid:YOUR_EVENT_ID` - The virtual event ID
- `eventsessioncontextid:*` - For event session context
- `appid:YOUR_APP_ID` - The application ID (often the domain name)

## Example Configuration

Here's an example configuration for a specific Kaltura environment:

```json
{
  "kaltura": {
    "session": {
      "privileges": {
        "default": "",
        "video": "privacycontext:2361952EPea2653e,searchcontext:2361952EPea2653e,setrole:PLAYBACK_BASE_ROLE,genieid:default",
        "meeting": "virtualeventid:2361952,eventsessioncontextid:*,appid:eventplatform-hackerspacelive.events.kaltura.com"
      }
    }
  }
}
```

## Troubleshooting

If you encounter issues with video search or playback:

1. Check the bot logs for session-related errors
2. Verify that your privacy context and search context are correct
3. Ensure that the user has appropriate permissions in Kaltura
4. Try increasing the log level to `debug` in your `.env` file to see detailed session information

## Server-Specific Configuration

You can also set different session privileges for different Discord servers by creating server-specific configuration overrides:

1. Create a file in `config/overrides/YOUR_SERVER_ID.json`
2. Add the kaltura session privileges configuration
3. The bot will automatically use these settings for that specific server

This allows you to connect different Discord servers to different Kaltura environments.