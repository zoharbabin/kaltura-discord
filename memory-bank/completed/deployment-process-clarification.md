# Kaltura-Discord Integration Deployment Process Clarification

## Setup vs. Direct Deployment

After reviewing the codebase, I can clarify the deployment process for the Kaltura-Discord integration:

### Starting from a Clean Environment

When starting from a clean environment (fresh clone or new installation), you should **run the setup script first** before running the deployment scripts. Here's why:

1. **The `setup-and-test.sh` script:**
   - Creates the initial `.env` file from `.env.example` if it doesn't exist
   - Checks for required tools (Node.js, npm, pnpm, cloudflared)
   - Installs main project dependencies
   - Builds the main project
   - Creates necessary directories (logs, config/overrides)
   - Checks environment variables and warns about missing ones
   - Sets up the Discord Activity component (installs dependencies, builds it)
   - Creates server-specific configuration for Discord Activity
   - Runs tests to verify the setup
   - Optionally runs the Discord bot setup script

2. **The `deploy-dev.sh` script:**
   - Assumes the `.env` file already exists (exits if not found)
   - Assumes dependencies are already installed
   - Builds the main Discord bot and Discord Activity
   - Starts the servers
   - Sets up a Cloudflare tunnel for local development
   - Does not perform initial setup tasks like creating directories or checking environment variables

### Recommended Process

For a clean environment, follow this process:

1. **Run setup first:**
   ```bash
   chmod +x setup-and-test.sh
   ./setup-and-test.sh
   ```

2. **Then deploy for development:**
   ```bash
   chmod +x deploy-dev.sh
   ./deploy-dev.sh
   ```

### When to Skip Setup

You can skip the setup script and run `deploy-dev.sh` directly if:

1. You've already run the setup script previously
2. You have a properly configured `.env` file
3. All dependencies are already installed
4. The project has been built at least once
5. The necessary directories (logs, config/overrides) already exist

## Production Deployment Process

The production deployment process is different from the development deployment. It deploys the Discord Activity to Cloudflare Workers instead of running it locally with a tunnel.

### Prerequisites for Production Deployment

Before deploying to production, ensure you have:

1. **Wrangler CLI** installed globally: `npm install -g wrangler`
2. **Cloudflare account** with access to Workers and custom domains
3. **Properly configured `.env` file** with production credentials
4. **Cloudflare authentication** set up (run `wrangler login` if needed)

### Production Deployment Steps

1. **Simplify Environment Variables (if not done already):**
   ```bash
   chmod +x simplify-env.sh
   ./simplify-env.sh
   ```
   This script:
   - Consolidates all environment variables into a single `.env` file
   - Creates a symbolic link from `discord-activity/.env` to the main `.env` file
   - Removes unnecessary environment files
   - Preserves special characters in environment variables

2. **Run Pre-Deployment Tests:**
   ```bash
   chmod +x test-before-deploy.sh
   ./test-before-deploy.sh
   ```
   This script:
   - Checks for required environment files
   - Runs ESLint to check code quality
   - Verifies TypeScript compilation
   - Runs unit tests
   - Checks for security vulnerabilities
   - Checks for outdated packages
   - Tests the Discord Activity build

3. **Deploy to Production:**
   ```bash
   chmod +x deploy-prod.sh
   ./deploy-prod.sh
   ```
   This script:
   - Loads environment variables from `.env`
   - Sets production-specific variables (`NODE_ENV=production`, `DISCORD_ACTIVITY_URL`, etc.)
   - Checks if Wrangler is installed
   - Runs pre-deployment tests
   - Builds the main Discord bot with production optimizations
   - Builds the Discord Activity with production optimizations
   - Creates or updates the `wrangler.toml` configuration if needed
   - Logs in to Cloudflare if not already authenticated
   - Deploys the Discord Activity to Cloudflare Workers
   - Verifies the deployment by checking the health endpoint

### Cloudflare Workers Configuration

The Discord Activity is deployed to Cloudflare Workers using the configuration in `discord-activity/wrangler.toml`. Key aspects include:

1. **Custom Domain:** The production environment uses `discord.zoharbabin.com`
2. **Static Assets:** Client-side files are served from `./packages/client/dist`
3. **Server Code:** The main server file is `./packages/server/dist/app.js`
4. **Environment Variables:** Production-specific variables are set in the `[env.production]` section
5. **Secrets:** Sensitive information (CLIENT_SECRET, KALTURA_ADMIN_SECRET, JWT_SECRET) must be set using `wrangler secret put <name>`

### Setting Secrets in Cloudflare

Before the first production deployment, you need to set the required secrets:

```bash
cd discord-activity
wrangler secret put CLIENT_SECRET
# Enter your Discord client secret when prompted

wrangler secret put KALTURA_ADMIN_SECRET
# Enter your Kaltura admin secret when prompted

wrangler secret put JWT_SECRET
# Enter your JWT secret when prompted
```

### Verifying Production Deployment

After deployment, verify that the application is running correctly:

1. Check the health endpoint: `https://discord.zoharbabin.com/api/health`
2. Test the Discord bot commands in your Discord server
3. Verify that the Discord Activity can be launched and functions correctly

## Environment Configuration

The deployment process relies on a properly configured `.env` file. The `setup-and-test.sh` script creates this file from `.env.example` if it doesn't exist, but you need to edit it with your actual credentials.

Key environment variables include:

- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `KALTURA_PARTNER_ID`
- `KALTURA_ADMIN_SECRET`
- `JWT_SECRET`
- `DISCORD_APPLICATION_ID`

## Discord Activity Configuration

For the Discord Activity component to work properly:

1. The Discord Activity needs its own `.env` file in the `discord-activity` directory (or a symbolic link to the main `.env`)
2. The server ID must be configured to enable Activities API access
3. The `DISCORD_APPLICATION_ID` must be set correctly

The `setup-and-test.sh` script handles these configurations if you choose to set up the Discord Activity.

## Deployment Scripts

The project includes several deployment scripts:

1. **`setup-and-test.sh`**: Initial setup and testing
2. **`simplify-env.sh`**: Consolidates environment variables into a single `.env` file
3. **`deploy-dev.sh`**: Development deployment with Cloudflare tunnel
4. **`deploy-prod.sh`**: Production deployment to Cloudflare Workers
5. **`test-before-deploy.sh`**: Pre-deployment testing

## Conclusion

To ensure a smooth deployment process:

1. For a clean environment, run `setup-and-test.sh` first to set up the environment
2. For development, run `deploy-dev.sh` to deploy locally with a Cloudflare tunnel
3. For production, run `simplify-env.sh` (if needed), then `test-before-deploy.sh`, and finally `deploy-prod.sh`

If you encounter any issues during deployment, check the logs for error messages and verify that all environment variables are correctly set.