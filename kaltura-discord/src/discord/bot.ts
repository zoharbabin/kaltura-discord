import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import { logger } from '../common/logger';
import { registerCommands } from './commands';
import { handleInteraction } from './interactions';

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Store commands in a collection
client.commands = new Collection();

/**
 * Start the Discord bot
 */
export async function startBot(): Promise<void> {
  try {
    // Get the Discord bot token
    const token = process.env.DISCORD_BOT_TOKEN;
    
    // Check if we're in development mode with placeholder token
    if (!token || token === 'your_discord_bot_token') {
      logger.warn('Using development mode: Discord bot will not connect to Discord API');
      logger.info('Discord bot started in development mode');
      return Promise.resolve();
    }
    
    // Register all commands
    await registerCommands(client);

    // Event: Client is ready
    client.once(Events.ClientReady, (readyClient) => {
      logger.info(`Discord bot logged in as ${readyClient.user.tag}`);
    });

    // Event: Interaction created (slash commands, buttons, etc.)
    client.on(Events.InteractionCreate, handleInteraction);

    // Login to Discord with the bot token
    await client.login(token);
    logger.info('Discord bot started successfully');
    
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to start Discord bot', { error });
    return Promise.reject(error);
  }
}

/**
 * Stop the Discord bot
 */
export async function stopBot(): Promise<void> {
  try {
    client.destroy();
    logger.info('Discord bot stopped successfully');
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to stop Discord bot', { error });
    return Promise.reject(error);
  }
}

// Extend the Discord.js Client interface to include commands
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}