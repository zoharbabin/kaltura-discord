#!/usr/bin/env node

/**
 * This script registers all slash commands with Discord.
 * Run this script after adding or modifying commands.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Create a custom environment variables handler
const envVars = {};

// Check if .env file exists
const envPath = path.resolve(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

// Load environment variables from .env file if it exists
if (envExists) {
  try {
    // Read and parse the .env file directly
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    // Parse each line and store in our envVars object
    envLines.forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }
      
      // Parse key=value pairs
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove surrounding quotes if they exist
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    });
    
    console.log('Loading environment variables from .env file with priority');
  } catch (error) {
    console.error('Error reading .env file:', error);
  }
}

// Also load with dotenv for backward compatibility with other modules
dotenv.config();

// Helper function to get environment variables with .env priority
function getEnv(key, defaultValue = '') {
  // First check our parsed .env values
  if (envVars[key] !== undefined) {
    return envVars[key];
  }
  
  // Fall back to process.env only if not found in .env
  return process.env[key] || defaultValue;
}

console.log(envExists ?
  'Environment variables loaded from .env file with priority' :
  'No .env file found, using system environment variables');

// Get the commands from the commands.ts file
const { SlashCommandBuilder } = require('@discordjs/builders');

// Define the commands
const commands = [
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

// Register commands with Discord
async function registerCommands() {
  const token = getEnv('DISCORD_BOT_TOKEN');
  const clientId = getEnv('DISCORD_CLIENT_ID');
  
  if (!token || !clientId) {
    console.error('Missing Discord credentials. Cannot register commands.');
    console.error('Make sure DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are set in your .env file.');
    process.exit(1);
  }
  
  const rest = new REST({ version: '9' }).setToken(token);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    // Convert commands to JSON
    const commandsJson = commands.map(command => command.toJSON());
    
    // Register commands globally
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandsJson },
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

// Run the registration
registerCommands();