import { REST, Routes, Client, Collection, SlashCommandBuilder } from 'discord.js';
import { logger } from '../common/logger';
import {
  handleStartCommand,
  handleJoinCommand,
  handleListCommand,
  handleEndCommand,
  handleConfigViewCommand,
  handleConfigUpdateCommand,
  handleConfigResetCommand
} from './commandHandlers';

// Define command types
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: any) => Promise<void>;
}

/**
 * Register all slash commands with Discord
 */
export async function registerCommands(client: Client): Promise<void> {
  try {
    // Get required environment variables
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    
    if (!token || !clientId || token === 'your_discord_bot_token' || clientId === 'your_discord_client_id') {
      logger.warn('Skipping command registration: Using development mode with placeholder credentials');
      return Promise.resolve();
    }

    // Define commands
    const commands = [
      // Start a Kaltura meeting
      new SlashCommandBuilder()
        .setName('kaltura-start')
        .setDescription('Start a new Kaltura meeting')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of meeting to start')
            .setRequired(true)
            .addChoices(
              { name: 'Webinar', value: 'webinar' },
              { name: 'Interactive Meeting', value: 'meeting' },
              { name: 'Virtual Classroom', value: 'classroom' }
            )
        )
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the meeting')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description of the meeting')
            .setRequired(false)
        ),
      
      // Join an existing Kaltura meeting
      new SlashCommandBuilder()
        .setName('kaltura-join')
        .setDescription('Join an existing Kaltura meeting')
        .addStringOption(option =>
          option.setName('meeting-id')
            .setDescription('ID of the meeting to join')
            .setRequired(true)
        ),
      
      // List active Kaltura meetings
      new SlashCommandBuilder()
        .setName('kaltura-list')
        .setDescription('List all active Kaltura meetings for this server'),
      
      // End a Kaltura meeting
      new SlashCommandBuilder()
        .setName('kaltura-end')
        .setDescription('End a Kaltura meeting')
        .addStringOption(option =>
          option.setName('meeting-id')
            .setDescription('ID of the meeting to end')
            .setRequired(true)
        ),
        
      // View server configuration
      new SlashCommandBuilder()
        .setName('kaltura-config-view')
        .setDescription('View the current Kaltura configuration for this server')
        .addStringOption(option =>
          option.setName('section')
            .setDescription('Configuration section to view')
            .setRequired(false)
            .addChoices(
              { name: 'All', value: 'all' },
              { name: 'Notifications', value: 'notifications' },
              { name: 'Commands', value: 'commands' },
              { name: 'Roles', value: 'roles' },
              { name: 'Features', value: 'features' }
            )
        ),
        
      // Update server configuration
      new SlashCommandBuilder()
        .setName('kaltura-config-update')
        .setDescription('Update the Kaltura configuration for this server')
        .addStringOption(option =>
          option.setName('section')
            .setDescription('Configuration section to update')
            .setRequired(true)
            .addChoices(
              { name: 'Notifications', value: 'notifications' },
              { name: 'Commands', value: 'commands' },
              { name: 'Roles', value: 'roles' },
              { name: 'Features', value: 'features' }
            )
        )
        .addStringOption(option =>
          option.setName('key')
            .setDescription('Configuration key to update (e.g., notifications.enabled, roles.mapping.admin)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('value')
            .setDescription('New value for the configuration key')
            .setRequired(true)
        ),
        
      // Reset server configuration
      new SlashCommandBuilder()
        .setName('kaltura-config-reset')
        .setDescription('Reset the Kaltura configuration for this server to defaults')
        .addBooleanOption(option =>
          option.setName('confirm')
            .setDescription('Confirm reset (required)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('section')
            .setDescription('Configuration section to reset')
            .setRequired(false)
            .addChoices(
              { name: 'All', value: 'all' },
              { name: 'Notifications', value: 'notifications' },
              { name: 'Commands', value: 'commands' },
              { name: 'Roles', value: 'roles' },
              { name: 'Features', value: 'features' }
            )
        ),
    ];

    // Register commands with Discord API
    const rest = new REST().setToken(token);
    
    logger.info('Started refreshing application (/) commands');
    
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map(command => command.toJSON()) },
    );
    
    logger.info('Successfully reloaded application (/) commands');
    
    // Store commands in the client's commands collection
    commands.forEach(command => {
      const commandName = command.name || command.toString().split('.')[1];
      
      // Set the appropriate command handler based on the command name
      let executeFunction;
      switch (commandName) {
        case 'kaltura-start':
          executeFunction = handleStartCommand;
          break;
        case 'kaltura-join':
          executeFunction = handleJoinCommand;
          break;
        case 'kaltura-list':
          executeFunction = handleListCommand;
          break;
        case 'kaltura-end':
          executeFunction = handleEndCommand;
          break;
        case 'kaltura-config-view':
          executeFunction = handleConfigViewCommand;
          break;
        case 'kaltura-config-update':
          executeFunction = handleConfigUpdateCommand;
          break;
        case 'kaltura-config-reset':
          executeFunction = handleConfigResetCommand;
          break;
        default:
          executeFunction = async (interaction: any) => {
            await interaction.reply({ content: `Command ${commandName} is not yet implemented`, ephemeral: true });
          };
      }
      
      client.commands.set(commandName, {
        data: command,
        execute: executeFunction
      });
    });
    
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to register commands', { error });
    return Promise.reject(error);
  }
}