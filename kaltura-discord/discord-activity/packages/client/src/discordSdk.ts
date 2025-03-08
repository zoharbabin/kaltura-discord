import { DiscordSDK } from '@discord/embedded-app-sdk';

export const discordSdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);

export interface DiscordAuth {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user?: {
    id: string;
    username: string;
    discriminator?: string;
    avatar?: string;
  };
}

let auth: DiscordAuth | null = null;

/**
 * Initialize the Discord SDK and authenticate with the Discord client
 * @returns The authentication result
 */
export async function initializeDiscordSDK(): Promise<DiscordAuth> {
  console.log('[DEBUG] Initializing Discord SDK');
  
  if (auth) {
    console.log('[DEBUG] Already authenticated, returning existing auth');
    return auth;
  }

  try {
    console.log('[DEBUG] Waiting for Discord SDK to be ready');
    // Wait for SDK to be ready
    await discordSdk.ready();
    console.log('[DEBUG] Discord SDK is ready');
    
    // Authorize with Discord Client
    console.log('[DEBUG] Authorizing with Discord client');
    const clientId = import.meta.env.VITE_CLIENT_ID;
    console.log('[DEBUG] Using client ID:', clientId);
    
    const { code } = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: [
        'applications.commands',
        'identify',
        'guilds',
        'guilds.members.read',
        'rpc.voice.read',
      ],
    });
    console.log('[DEBUG] Received authorization code');
    
    // Exchange code for token
    console.log('[DEBUG] Exchanging code for token');
    const response = await fetch('/.proxy/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG] Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        responseText: errorText
      });
      throw new Error(`Failed to exchange code for token: ${response.status} ${response.statusText}`);
    }
    
    const tokenData = await response.json();
    console.log('[DEBUG] Received token data');
    
    // Authenticate with Discord client
    console.log('[DEBUG] Authenticating with Discord client');
    const authResult = await discordSdk.commands.authenticate({
      access_token: tokenData.access_token,
    });
    
    if (!authResult) {
      console.error('[DEBUG] Authentication failed - no result returned');
      throw new Error('Authenticate command failed');
    }
    console.log('[DEBUG] Authentication successful');
    
    // Store auth data
    auth = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    };
    
    console.log('[DEBUG] Discord SDK initialization complete');
    return auth;
  } catch (error) {
    console.error('[DEBUG] Discord SDK initialization failed:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

/**
 * Get the current voice channel information
 * @returns The voice channel information
 */
export async function getVoiceChannel() {
  console.log('[DEBUG] Getting voice channel information');
  
  if (!discordSdk.channelId || !discordSdk.guildId) {
    console.error('[DEBUG] Not in a voice channel - channelId or guildId missing');
    console.log('[DEBUG] SDK state:', {
      channelId: discordSdk.channelId,
      guildId: discordSdk.guildId
    });
    throw new Error('Not in a voice channel');
  }
  
  try {
    console.log('[DEBUG] Fetching channel information for:', discordSdk.channelId);
    // Get channel information
    const channel = await discordSdk.commands.getChannel({
      channel_id: discordSdk.channelId,
    });
    
    console.log('[DEBUG] Channel information received:', channel);
    
    const result = {
      id: discordSdk.channelId,
      guildId: discordSdk.guildId,
      name: channel.name || 'Unknown Channel',
    };
    
    console.log('[DEBUG] Returning voice channel info:', result);
    return result;
  } catch (error) {
    console.error('[DEBUG] Error getting voice channel information:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

/**
 * Get the current user's information
 * @returns The user information
 */
export async function getCurrentUser() {
  console.log('[DEBUG] Getting current user information');
  
  if (!auth) {
    console.error('[DEBUG] Not authenticated - auth object is null');
    throw new Error('Not authenticated');
  }
  
  try {
    console.log('[DEBUG] Fetching user information from Discord API');
    // Get user information from Discord API
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG] Failed to get user information:', {
        status: response.status,
        statusText: response.statusText,
        responseText: errorText
      });
      throw new Error(`Failed to get user information: ${response.status} ${response.statusText}`);
    }
    
    const user = await response.json();
    console.log('[DEBUG] User information received:', {
      id: user.id,
      username: user.username,
      // Don't log the full user object as it may contain sensitive information
    });
    
    // Update auth with user information
    auth.user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
    };
    
    console.log('[DEBUG] User information stored in auth object');
    return auth.user;
  } catch (error) {
    console.error('[DEBUG] Error getting user information:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

/**
 * Send a message to all participants via Discord SDK
 * @param type The message type
 * @param data The message data
 */
export async function sendMessage(type: string, data: any) {
  console.log('[DEBUG] Sending message:', { type, data });
  
  try {
    // Use postMessage instead of sendMessage since sendMessage doesn't exist on the SDK
    // This sends a message to the Discord client which will then broadcast it to other participants
    window.postMessage({
      type,
      data,
    }, '*');
    
    console.log('[DEBUG] Message sent successfully');
  } catch (error) {
    console.error('[DEBUG] Error sending message:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

/**
 * Add a message listener for a specific message type
 * @param type The message type to listen for
 * @param callback The callback function to call when a message of this type is received
 */
export function addMessageListener(type: string, callback: (data: any) => void) {
  console.log(`[DEBUG] Adding message listener for type: ${type}`);
  
  const handler = (event: MessageEvent) => {
    // Log all messages for debugging (but not too verbose)
    if (event.data && event.data.type) {
      if (event.data.type === type) {
        console.log(`[DEBUG] Received message of type: ${type}`, {
          data: event.data.data,
          source: event.source ? 'window' : 'unknown'
        });
        
        try {
          callback(event.data.data);
          console.log(`[DEBUG] Successfully processed ${type} message`);
        } catch (error) {
          console.error(`[DEBUG] Error processing ${type} message:`, error);
          if (error instanceof Error) {
            console.error('[DEBUG] Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
          }
        }
      } else if (type === 'PLAYBACK_SYNC' || type === 'SYNC_REQUEST') {
        // Only log these specific message types for debugging sync issues
        console.log(`[DEBUG] Received other message type: ${event.data.type} (while listening for ${type})`);
      }
    }
  };
  
  window.addEventListener('message', handler);
  console.log(`[DEBUG] Message listener for ${type} registered`);
  
  // Return a function to remove the listener
  return () => {
    console.log(`[DEBUG] Removing message listener for type: ${type}`);
    window.removeEventListener('message', handler);
  };
}