# Environment Configuration for Kaltura-Discord Integration

This document outlines the environment configuration for both development and production environments for the Kaltura-Discord integration project.

## Overview

The project uses a simplified approach to environment configuration, with a single `.env` file for both the main Discord bot and the Discord Activity component. Environment-specific variables are set by the deployment scripts at runtime.

## Single Environment File

The project uses a single `.env` file with all configuration values:

```
# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_APPLICATION_ID=your_discord_application_id

# Kaltura API Configuration
KALTURA_PARTNER_ID=your_kaltura_partner_id
KALTURA_ADMIN_SECRET=your_kaltura_admin_secret
KALTURA_API_ENDPOINT=https://www.kaltura.com/api_v3
KALTURA_PLAYER_ID=your_kaltura_player_id

# API Gateway Configuration
API_PORT=3000

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=1h

# Logging Configuration
LOG_LEVEL=info

# Discord Activity Client Configuration
VITE_CLIENT_ID=${DISCORD_CLIENT_ID}
VITE_KALTURA_PARTNER_ID=${KALTURA_PARTNER_ID}
VITE_KALTURA_PLAYER_ID=${KALTURA_PLAYER_ID}
VITE_KALTURA_API_ENDPOINT=${KALTURA_API_ENDPOINT}

# Discord Activity Server Configuration
PORT=3001
```

## Deployment Scripts

The deployment scripts (`deploy-dev.sh` and `deploy-prod.sh`) set environment-specific variables at runtime:

### Development Environment (deploy-dev.sh)

```bash
# Load environment variables from .env
source .env

# Set development-specific environment variables
export NODE_ENV=development
export DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com
export PUBLIC_URL=http://localhost:3000
```

### Production Environment (deploy-prod.sh)

```bash
# Load environment variables from .env
source .env

# Set production-specific environment variables
export NODE_ENV=production
export DISCORD_ACTIVITY_URL=https://discord.zoharbabin.com
export PUBLIC_URL=https://discord.zoharbabin.com
```

## Environment Variable Usage

### Loading Environment Variables

The project uses a custom environment service to load and manage environment variables:

```typescript
// src/common/envService.ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Create a custom environment variables handler
export const envVars: Record<string, string> = {};

// Load environment variables from .env file
export function loadEnvFile(envFile: string = '.env'): void {
  try {
    // Load .env file
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      
      // Store values in our custom object
      for (const key in envConfig) {
        envVars[key] = envConfig[key];
      }
      
      console.log(`Loaded environment variables from ${envFile}`);
    } else {
      console.warn(`Environment file ${envFile} not found`);
    }
  } catch (error) {
    console.error(`Error loading environment variables from ${envFile}:`, error);
  }
}

// Helper function to get environment variables with .env priority
export function getEnv(key: string, defaultValue: string = ''): string {
  // First check our parsed .env values
  if (envVars[key] !== undefined) {
    return envVars[key];
  }
  
  // Fall back to process.env only if not found in .env
  return process.env[key] || defaultValue;
}

// Load environment variables from .env file
loadEnvFile('.env');
```

### Using Environment Variables

Use the `getEnv` function to access environment variables throughout the codebase:

```typescript
import { getEnv } from '../common/envService';

// Use getEnv to access environment variables
const apiPort = getEnv('API_PORT', '3000');
const jwtSecret = getEnv('JWT_SECRET', 'default_jwt_secret_for_development');
```

## Environment-Specific Configuration

### Development-Specific Configuration

In development mode, the application:
- Uses more verbose logging
- Connects to a local development server
- Uses a Cloudflare tunnel to expose the local server at `https://discord-dev.zoharbabin.com`

### Production-Specific Configuration

In production mode, the application:
- Uses less verbose logging
- Is deployed directly to Cloudflare
- Uses the production domain `https://discord.zoharbabin.com`

## Configuration Service Enhancements

The configuration service now supports environment variable placeholders in the format `{{ENV_VAR_NAME}}`:

```typescript
private replaceEnvPlaceholders(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // Extract environment variable name
      const envVarName = value.substring(2, value.length - 2);
      // Replace with environment variable value or keep original if not found
      const envValue = process.env[envVarName];
      if (envValue !== undefined) {
        obj[key] = envValue;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      this.replaceEnvPlaceholders(value);
    }
  });
}
```

This allows for dynamic configuration based on environment variables, such as:

```json
{
  "features": {
    "discordActivityUrl": "{{DISCORD_ACTIVITY_URL}}"
  }
}
```

## Securing Environment Variables

### Local Development

For local development, environment variables are stored in a `.env` file, which should be excluded from version control:

```
# .gitignore
.env
.env.backup
```

### Production Deployment

For production deployment, environment variables should be set in the Cloudflare Workers environment:

```bash
# Set environment variables in Cloudflare Workers
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put KALTURA_ADMIN_SECRET
npx wrangler secret put JWT_SECRET
```

## Environment Setup Scripts

The project includes scripts to simplify environment variable management:

1. **simplify-env.sh**: Creates a single `.env` file from existing environment files
   ```bash
   ./simplify-env.sh
   ```

2. **cleanup-env.sh**: Cleans up unnecessary environment files
   ```bash
   ./cleanup-env.sh
   ```

## Environment Variable Management Best Practices

1. **Use a single .env file**: Store all environment-specific configuration in a single `.env` file
2. **Set environment-specific variables in deployment scripts**: Use the deployment scripts to set environment-specific variables at runtime
3. **Never commit sensitive information**: Keep all `.env` files in `.gitignore`
4. **Use different values for development and production**: Especially for secrets and tokens
5. **Provide default values**: Always provide sensible default values for non-critical environment variables
6. **Validate required variables**: Check for required environment variables during application startup
7. **Document all variables**: Keep this document updated with all environment variables used in the project
8. **Use the environment service**: Always use the `getEnv` function to access environment variables, never access `process.env` directly
9. **Handle special characters properly**: Ensure that special characters in environment variables are properly handled

## Troubleshooting

If environment variables are not being loaded correctly:

1. Check that the `.env` file exists in the project root directory
2. Verify that the file contains the expected variables with correct values
3. Ensure that the environment service is imported before any other services that depend on environment variables
4. Check for circular dependencies between modules that might prevent proper initialization
5. Verify that the deployment script is correctly setting environment-specific variables
6. Check for special characters in environment variables that might cause issues when loading