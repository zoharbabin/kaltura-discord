# Cloudflare Wrangler Configuration

This file contains the configuration for deploying the Discord Activity to Cloudflare using Wrangler. Copy this content to a file named `wrangler.toml` in the `discord-activity` directory.

```toml
name = "discord-activity"
type = "webpack"
account_id = "your-account-id"
workers_dev = true
route = "discord.zoharbabin.com/*"
zone_id = "your-zone-id"

[site]
bucket = "./packages/client/dist"
entry-point = "workers-site"

[env.production]
route = "discord.zoharbabin.com/*"

[env.development]
route = "discord-dev.zoharbabin.com/*"

# Add any environment variables needed by your worker
[vars]
ENVIRONMENT = "production"
```

## Configuration Values

- `name`: The name of your Cloudflare Worker
- `account_id`: Your Cloudflare account ID (found in the Cloudflare dashboard)
- `zone_id`: Your Cloudflare zone ID for the domain (found in the Cloudflare dashboard)
- `route`: The URL pattern to route to your worker
- `bucket`: The directory containing your built static assets
- `entry-point`: The entry point for your worker

## Environment-Specific Configuration

The configuration includes separate environments for production and development:

- `env.production`: Configuration for the production environment (discord.zoharbabin.com)
- `env.development`: Configuration for the development environment (discord-dev.zoharbabin.com)

To deploy to a specific environment, use:

```bash
# Deploy to production
npx wrangler publish --env production

# Deploy to development
npx wrangler publish --env development
```

## CORS Configuration

If you encounter CORS issues, you can add a custom worker script to handle CORS headers. Create a file named `workers-site/index.js` with the following content:

```javascript
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  try {
    const response = await getAssetFromKV(event);
    
    // Clone the response so that it's no longer immutable
    const newResponse = new Response(response.body, response);
    
    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return newResponse;
  } catch (e) {
    return new Response('Not Found', { status: 404 });
  }
}
```

## Additional Resources

- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI documentation](https://developers.cloudflare.com/workers/wrangler/commands/)
- [KV Asset Handler documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)