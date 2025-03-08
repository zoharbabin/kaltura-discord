# Environment Variable Management

## Overview

The Kaltura-Discord integration uses a simplified approach to environment variable management, with a single `.env` file for both the main Discord bot and the Discord Activity component. This approach provides a consistent and reliable way to configure the application across different environments.

## Implementation

### Environment Service

The environment service is implemented in `src/common/envService.ts` and provides the following functionality:

1. **Direct .env File Reading**: Reads and parses the `.env` file directly, storing values in a dedicated object.
2. **Prioritized Access**: Provides a `getEnv()` function that first checks for values in the parsed `.env` object before falling back to system environment variables.
3. **Circular Dependency Prevention**: Isolates environment variable handling in a separate service to prevent circular dependencies between modules.
4. **Environment-Specific Variables**: Environment-specific variables (like `NODE_ENV`, `DISCORD_ACTIVITY_URL`, and `PUBLIC_URL`) are set by the deployment scripts at runtime.

### Key Components

```typescript
// Create a custom environment variables handler
export const envVars: Record<string, string> = {};

// Helper function to get environment variables with .env priority
export function getEnv(key: string, defaultValue: string = ''): string {
  // First check our parsed .env values
  if (envVars[key] !== undefined) {
    return envVars[key];
  }
  
  // Fall back to process.env only if not found in .env
  return process.env[key] || defaultValue;
}
```

## Deployment Scripts

The deployment scripts (`deploy-dev.sh` and `deploy-prod.sh`) handle environment-specific variables:

```bash
# Load environment variables safely without sourcing the file
while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip comments and empty lines
  if [[ $key =~ ^[[:space:]]*# ]] || [[ -z "$key" ]]; then
    continue
  fi
  
  # Remove leading/trailing whitespace
  key=$(echo "$key" | xargs)
  
  # Export the variable
  export "$key=$value"
done < .env

# Set environment-specific variables
export NODE_ENV=development
export DISCORD_ACTIVITY_URL=https://discord-dev.zoharbabin.com
export PUBLIC_URL=http://localhost:3000
```

## Configuration Service

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

## Usage

Services that need access to environment variables should import the `getEnv` function from the environment service:

```typescript
import { getEnv } from '../common/envService';

// Use getEnv to access environment variables
const apiPort = getEnv('API_PORT', '3000');
const jwtSecret = getEnv('JWT_SECRET', 'default_jwt_secret_for_development');
```

## Environment Variables

The application uses the following environment variables:

### Discord Configuration
- `DISCORD_BOT_TOKEN`: Discord bot token for authentication
- `DISCORD_CLIENT_ID`: Discord client ID for API access
- `DISCORD_CLIENT_SECRET`: Discord client secret for API access
- `DISCORD_APPLICATION_ID`: Discord application ID

### Kaltura API Configuration
- `KALTURA_PARTNER_ID`: Kaltura partner ID for API access
- `KALTURA_ADMIN_SECRET`: Kaltura admin secret for API access
- `KALTURA_API_ENDPOINT`: Kaltura API endpoint URL (default: https://www.kaltura.com/api_v3)
- `KALTURA_PLAYER_ID`: Kaltura player ID for video playback

### API Gateway Configuration
- `API_PORT`: Port for the API Gateway to listen on (default: 3000)

### JWT Configuration
- `JWT_SECRET`: Secret key for JWT token generation and validation
- `JWT_EXPIRY`: JWT token expiry time (default: 1h)

### Logging Configuration
- `LOG_LEVEL`: Logging level (default: info)

### Discord Activity Client Configuration
- `VITE_CLIENT_ID`: Same as DISCORD_CLIENT_ID
- `VITE_KALTURA_PARTNER_ID`: Same as KALTURA_PARTNER_ID
- `VITE_KALTURA_PLAYER_ID`: Same as KALTURA_PLAYER_ID
- `VITE_KALTURA_API_ENDPOINT`: Same as KALTURA_API_ENDPOINT

### Discord Activity Server Configuration
- `PORT`: Port for the Discord Activity server (default: 3001)

### Environment-Specific Variables (Set by Deployment Scripts)
- `NODE_ENV`: Node environment (development or production)
- `DISCORD_ACTIVITY_URL`: URL for the Discord Activity (dev: https://discord-dev.zoharbabin.com, prod: https://discord.zoharbabin.com)
- `PUBLIC_URL`: Public URL for the Discord Activity (dev: http://localhost:3000, prod: https://discord.zoharbabin.com)

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

## Best Practices

1. **Use a single .env file**: Store all environment-specific configuration in a single `.env` file.
2. **Never commit .env files**: Keep the `.env` file in `.gitignore` to prevent accidental exposure of secrets.
3. **Use getEnv consistently**: Always use the `getEnv` function to access environment variables, never access `process.env` directly.
4. **Provide default values**: Always provide sensible default values for non-critical environment variables.
5. **Validate required variables**: Check for required environment variables during application startup.
6. **Use environment-specific variables**: Set environment-specific variables in the deployment scripts.

## Troubleshooting

If environment variables are not being loaded correctly:

1. Check that the `.env` file exists in the project root directory.
2. Verify that the `.env` file contains the expected variables with correct values.
3. Ensure that the environment service is imported before any other services that depend on environment variables.
4. Check for circular dependencies between modules that might prevent proper initialization.
5. Verify that the deployment script is correctly setting environment-specific variables.
6. Check for special characters in environment variables that might cause issues when loading.