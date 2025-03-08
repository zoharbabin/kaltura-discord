import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { logger } from '../common/logger';
import { getEnv } from '../common/envService';

// Define the commands
const commands = [
  // Entry Point command required for Discord Activities
  // This is automatically created when Activities are enabled in the Discord Developer Portal
  // Including it here prevents the "You cannot remove this app's Entry Point command" error
  new SlashCommandBuilder()
    .setName('launch')
    .setDescription('Launch Kaltura Activity'),
    
  new SlashCommandBuilder()
    .setName('kaltura-start')
    .setDescription('Start a new Kaltura meeting or webinar')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('The type of meeting to start')
        .setRequired(true)
        .addChoices(
          { name: 'Meeting', value: 'meeting' },
          { name: 'Webinar', value: 'webinar' },
          { name: 'Classroom', value: 'classroom' }
        ))
    .addStringOption(option =>
      option.setName('title')
        .setDescription('The title of the meeting')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('The description of the meeting')
        .setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('kaltura-join')
    .setDescription('Join an existing Kaltura meeting')
    .addStringOption(option =>
      option.setName('meeting-id')
        .setDescription('The ID of the meeting to join')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('kaltura-list')
    .setDescription('List all active Kaltura meetings'),
  
  new SlashCommandBuilder()
    .setName('kaltura-end')
    .setDescription('End a Kaltura meeting')
    .addStringOption(option =>
      option.setName('meeting-id')
        .setDescription('The ID of the meeting to end')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('kaltura-config-view')
    .setDescription('View the current configuration for this server'),
  
  new SlashCommandBuilder()
    .setName('kaltura-config-update')
    .setDescription('Update a configuration setting')
    .addStringOption(option =>
      option.setName('section')
        .setDescription('The configuration section to update')
        .setRequired(true)
        .addChoices(
          { name: 'Notifications', value: 'notifications' },
          { name: 'Commands', value: 'commands' },
          { name: 'Roles', value: 'roles' },
          { name: 'Features', value: 'features' }
        ))
    .addStringOption(option =>
      option.setName('key')
        .setDescription('The configuration key to update (e.g., notifications.enabled)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('value')
        .setDescription('The new value for the configuration key')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('kaltura-config-reset')
    .setDescription('Reset configuration to default values')
    .addStringOption(option =>
      option.setName('section')
        .setDescription('The configuration section to reset (or "all" for everything)')
        .setRequired(true)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Notifications', value: 'notifications' },
          { name: 'Commands', value: 'commands' },
          { name: 'Roles', value: 'roles' },
          { name: 'Features', value: 'features' }
        ))
    .addBooleanOption(option =>
      option.setName('confirm')
        .setDescription('Confirm the reset operation')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('kaltura-video-search')
    .setDescription('Search for videos in Kaltura')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Search query')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Maximum number of results (1-10)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('kaltura-get-ks')
    .setDescription('Get the current Kaltura Session (debug command)')
];

// Function to register commands with Discord
export async function registerCommands(client?: any) {
  const token = getEnv('DISCORD_BOT_TOKEN');
  const clientId = getEnv('DISCORD_CLIENT_ID');
  
  if (!token || !clientId) {
    logger.error('Missing Discord credentials. Cannot register commands.');
    return;
  }
  
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    logger.info('Started refreshing application (/) commands.');
    
    // Convert commands to JSON
    const commandsJson = commands.map(command => command.toJSON());
    
    // Register commands globally with proper metadata
    await rest.put(
      Routes.applicationCommands(clientId),
      {
        body: commandsJson.map(cmd => {
          // Special handling for the Entry Point command
          if (cmd.name === 'launch') {
            return {
              ...cmd,
              application_id: clientId,
              version: '1',
              default_member_permissions: null,
              type: 4, // PRIMARY_ENTRY_POINT type
              handler: 2, // DISCORD_LAUNCH_ACTIVITY handler
              integration_types: [0, 1], // Both server and user installations
              contexts: [0, 1, 2], // All contexts (guild, DM with bot, DMs with others)
              dm_permission: true
            };
          }
          
          // Regular commands
          return {
            ...cmd,
            application_id: clientId,
            version: '1',
            default_member_permissions: null,
            type: 1, // CHAT_INPUT type
            dm_permission: true
          };
        })
      },
    );
    
    logger.info('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error('Failed to register commands', { error });
  }
}