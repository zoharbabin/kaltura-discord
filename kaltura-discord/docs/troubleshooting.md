# Troubleshooting Guide

This document provides solutions to common issues you might encounter when setting up and running the Kaltura-Discord integration.

## Discord Bot Issues

### "Used disallowed intents" Error

**Problem:** The Discord bot fails to start with an error message like:
```
Failed to start Discord bot: Error: Used disallowed intents
```

**Solution:** 
This error occurs when the bot is requesting Discord intents that haven't been enabled in the Discord Developer Portal. There are two ways to fix this:

1. **Modify the bot code to remove privileged intents:**
   - In `src/discord/bot.ts`, remove or comment out privileged intents like `GatewayIntentBits.MessageContent`
   - This approach allows the bot to work with minimal permissions

2. **Enable privileged intents in the Discord Developer Portal:**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Navigate to the "Bot" tab
   - Under "Privileged Gateway Intents", enable the required intents (e.g., MESSAGE CONTENT INTENT)
   - Save your changes

**Note:** If your bot functionality requires reading message content, you should use option 2 and enable the necessary privileged intents in the Discord Developer Portal.

## Environment Variables Issues

### JWT Secret Warning

**Problem:** You see a warning like:
```
Warning: JWT_SECRET is not set or has default value.
```

**Solution:**
Set a strong, unique JWT_SECRET in your .env file. This is used for securing API tokens and should be a random string of at least 32 characters.

## API Gateway Issues

(Add API Gateway troubleshooting items here as they arise)

## Kaltura API Issues

(Add Kaltura API troubleshooting items here as they arise)