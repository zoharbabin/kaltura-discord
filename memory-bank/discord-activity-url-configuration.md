# Discord Activity URL Configuration

## Problem Statement

Currently, the Discord Activity is launched using the default Discord URL (`discord.com/activities`), but we need to configure it to use a custom domain (`discord-dev.zoharbabin.com`) that has been set up with a Cloudflare tunnel.

## Solution Overview

We need to modify the application to allow configuring the Discord Activity URL through environment variables and server configuration. This will enable pointing the Discord Activity to load from the custom domain.

## Implementation Details

### 1. Update the ServerConfig Interface

Extend the `ServerConfig` interface in `configService.ts` to include a new field for the Discord Activity URL:

```typescript
export interface ServerConfig {
  // ... existing fields ...
  features: {
    [feature: string]: boolean | string; // Changed from just boolean to allow string values
    discordApplicationId?: string;
    discordActivityUrl?: string; // New field for the Discord Activity URL
  };
  // ... other fields ...
}
```

### 2. Update the Default Configuration

Add the new field to the default configuration in `default_config.json`:

```json
{
  "features": {
    "embedding": true,
    "recording": true,
    "user_sync": true,
    "activitiesApi": false,
    "discordApplicationId": "",
    "discordActivityUrl": "https://discord.com/activities" // Default URL
  }
}
```

### 3. Update the launchDiscordActivity Function

Modify the `launchDiscordActivity` function in `kalturaActivity.ts` to use the new configuration:

```typescript
// Create the Discord Activity URL
const activityBaseUrl = config.features?.discordActivityUrl || 
                        getEnv('DISCORD_ACTIVITY_URL', 'https://discord.com/activities');
const activityUrl = `${activityBaseUrl}/${applicationId}?metadata=${encodeURIComponent(JSON.stringify(metadata))}`;
```

### 4. Update the .env.example File

Add the new environment variable to the `.env.example` file:

```
# Discord Activity URL (optional, defaults to discord.com/activities)
DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com
```

## Usage

With these changes, users can configure the Discord Activity URL in two ways:

1. **Environment Variable**: Set the `DISCORD_ACTIVITY_URL` environment variable in the `.env` file:
   ```
   DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com
   ```

2. **Server Configuration**: Update the server configuration using the Discord bot command:
   ```
   /kaltura-config-update features.discordActivityUrl https://discord-dev.zoharbabin.com
   ```

## Implementation Steps

1. Switch to Code mode to implement these changes
2. Update the `ServerConfig` interface in `configService.ts`
3. Update the `launchDiscordActivity` function in `kalturaActivity.ts`
4. Update the default configuration in `default_config.json`
5. Update the `.env.example` file
6. Test the changes by launching a Discord Activity