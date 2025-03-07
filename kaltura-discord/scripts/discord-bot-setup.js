#!/usr/bin/env node

/**
 * Discord Bot Setup Script
 * 
 * This script helps with setting up and configuring the Discord bot:
 * - Validates the Discord bot token
 * - Checks which intents are enabled
 * - Generates an OAuth2 URL for adding the bot to servers
 * - Provides guidance for manual steps in the Discord Developer Portal
 */

const axios = require('axios');
const chalk = require('chalk');
const inquirer = require('inquirer');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const REQUIRED_INTENTS = ['GUILDS', 'GUILD_MESSAGES'];
const PRIVILEGED_INTENTS = ['MESSAGE_CONTENT', 'GUILD_MEMBERS', 'GUILD_PRESENCES'];

/**
 * Main function
 */
async function main() {
  console.log(chalk.bold('\nDiscord Bot Setup and Configuration\n'));

  // Check if token and client ID are set
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  
  if (!token || token === 'your_discord_bot_token') {
    console.log(chalk.red('Error: DISCORD_BOT_TOKEN is not set or has default value.'));
    console.log(chalk.yellow('Please set a valid Discord bot token in your .env file.'));
    process.exit(1);
  }

  if (!clientId || clientId === 'your_discord_client_id') {
    console.log(chalk.red('Error: DISCORD_CLIENT_ID is not set or has default value.'));
    console.log(chalk.yellow('Please set a valid Discord client ID in your .env file.'));
    process.exit(1);
  }

  try {
    // Validate token by getting bot information
    console.log(chalk.blue('Validating Discord bot token...'));
    const botInfo = await validateToken(token);
    console.log(chalk.green(`✓ Token is valid for bot: ${botInfo.username}#${botInfo.discriminator}`));
    
    // Check which intents are enabled
    console.log(chalk.blue('\nChecking bot intents...'));
    await checkIntents(token);
    
    // Generate OAuth2 URL
    console.log(chalk.blue('\nGenerating OAuth2 URL for adding the bot to servers...'));
    const oauthUrl = generateOAuthUrl(clientId);
    console.log(chalk.green(`✓ OAuth2 URL: ${oauthUrl}`));
    
    // Provide guidance for manual steps
    console.log(chalk.blue('\nManual steps required in Discord Developer Portal:'));
    console.log(chalk.yellow('1. Go to https://discord.com/developers/applications'));
    console.log(chalk.yellow(`2. Select your application (${botInfo.username})`));
    console.log(chalk.yellow('3. Navigate to the "Bot" tab'));
    console.log(chalk.yellow('4. Under "Privileged Gateway Intents", enable ALL of the following:'));
    console.log(chalk.yellow('   - PRESENCE INTENT'));
    console.log(chalk.yellow('   - SERVER MEMBERS INTENT'));
    console.log(chalk.yellow('   - MESSAGE CONTENT INTENT'));
    console.log(chalk.yellow('5. Save your changes'));
    
    // Ask if user wants to open the OAuth URL
    const { openUrl } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openUrl',
        message: 'Would you like to open the OAuth2 URL to add the bot to a server?',
        default: false
      }
    ]);
    
    if (openUrl) {
      const { default: open } = await import('open');
      await open(oauthUrl);
      console.log(chalk.green('OAuth2 URL opened in your default browser.'));
    }
    
    console.log(chalk.bold('\nDiscord bot setup completed successfully!'));
    
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`Status: ${error.response.status}`));
      console.log(chalk.red(`Details: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    process.exit(1);
  }
}

/**
 * Validate Discord bot token
 * @param {string} token Discord bot token
 * @returns {Promise<object>} Bot information
 */
async function validateToken(token) {
  try {
    const response = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bot ${token}`
      }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error('Invalid Discord bot token. Please check your token and try again.');
    }
    throw error;
  }
}

/**
 * Check which intents are enabled for the bot
 * @param {string} token Discord bot token
 */
async function checkIntents(token) {
  try {
    // Unfortunately, Discord API doesn't provide a direct way to check enabled intents
    // We can only infer based on bot behavior or connection errors
    
    console.log(chalk.yellow('Note: Discord API does not allow checking enabled intents directly.'));
    console.log(chalk.yellow('The application will detect intent issues when it starts.'));
    
    console.log(chalk.blue('\nRequired intents:'));
    for (const intent of REQUIRED_INTENTS) {
      console.log(chalk.green(`✓ ${intent} (required)`));
    }
    
    console.log(chalk.blue('\nPrivileged intents:'));
    for (const intent of PRIVILEGED_INTENTS) {
      console.log(chalk.yellow(`? ${intent} (privileged, requires manual approval)`));
    }
    
    // Modify bot.ts to check for code changes
    const botFilePath = path.join(__dirname, '..', 'src', 'discord', 'bot.ts');
    const botFileContent = fs.readFileSync(botFilePath, 'utf8');
    
    // Check for each privileged intent
    const intentChecks = [
      { name: 'MessageContent', code: 'GatewayIntentBits.MessageContent' },
      { name: 'GuildMembers', code: 'GatewayIntentBits.GuildMembers' },
      { name: 'GuildPresences', code: 'GatewayIntentBits.GuildPresences' }
    ];
    
    let anyIntentUncommented = false;
    let intentsToComment = [];
    
    for (const intent of intentChecks) {
      if (botFileContent.includes(intent.code) && !botFileContent.includes(`// ${intent.code}`)) {
        anyIntentUncommented = true;
        intentsToComment.push(intent);
      }
    }
    
    if (anyIntentUncommented) {
      console.log(chalk.yellow('\nWarning: Your bot code is using privileged intents:'));
      intentsToComment.forEach(intent => {
        console.log(chalk.yellow(`- ${intent.name}`));
      });
      console.log(chalk.yellow('If these intents are not enabled in the Discord Developer Portal,'));
      console.log(chalk.yellow('the bot will fail to connect with "Used disallowed intents" error.'));
      
      const { modifyCode } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'modifyCode',
          message: 'Would you like to comment out these privileged intents in the code?',
          default: false
        }
      ]);
      
      if (modifyCode) {
        let updatedContent = botFileContent;
        for (const intent of intentsToComment) {
          updatedContent = updatedContent.replace(
            `${intent.code},`,
            `// ${intent.code},`
          );
        }
        fs.writeFileSync(botFilePath, updatedContent);
        console.log(chalk.green('✓ Privileged intents commented out in the code.'));
      }
    } else {
      // Check if any intents are already commented
      let anyIntentCommented = false;
      for (const intent of intentChecks) {
        if (botFileContent.includes(`// ${intent.code}`)) {
          anyIntentCommented = true;
          break;
        }
      }
      
      if (anyIntentCommented) {
        console.log(chalk.yellow('\nNote: Some privileged intents are commented out in your code.'));
        console.log(chalk.yellow('If you need this functionality, enable them in the Discord Developer Portal'));
        console.log(chalk.yellow('and uncomment the lines in src/discord/bot.ts.'));
      }
    }
  } catch (error) {
    console.log(chalk.red(`Error checking intents: ${error.message}`));
  }
}

/**
 * Generate OAuth2 URL for adding the bot to servers
 * @param {string} clientId Discord client ID
 * @returns {string} OAuth2 URL
 */
function generateOAuthUrl(clientId) {
  const scopes = ['bot', 'applications.commands'];
  // Based on code audit, these are the only permissions truly needed
  const permissions = [
    // General Permissions
    'VIEW_CHANNEL',  // Needed to see channels where commands are used
    
    // Text Permissions
    'SEND_MESSAGES',  // Needed to send responses to commands
    'EMBED_LINKS',    // Needed for rich embeds in responses
    'READ_MESSAGE_HISTORY',  // Needed to read context of commands
    'USE_APPLICATION_COMMANDS',  // Needed for slash commands
    'ADD_REACTIONS'   // Needed for interactive responses
  ];
  
  // Convert permissions to the numeric value
  const permissionValue = calculatePermissions(permissions);
  
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissionValue}&scope=${scopes.join('%20')}`;
}

/**
 * Calculate permissions value from permission names
 * @param {string[]} permissions Array of permission names
 * @returns {string} Permission value as a string
 */
function calculatePermissions(permissions) {
  const permissionMap = {
    'CREATE_INSTANT_INVITE': 1 << 0,
    'KICK_MEMBERS': 1 << 1,
    'BAN_MEMBERS': 1 << 2,
    'ADMINISTRATOR': 1 << 3,
    'MANAGE_CHANNELS': 1 << 4,
    'MANAGE_GUILD': 1 << 5,
    'ADD_REACTIONS': 1 << 6,
    'VIEW_AUDIT_LOG': 1 << 7,
    'PRIORITY_SPEAKER': 1 << 8,
    'STREAM': 1 << 9,
    'VIEW_CHANNEL': 1 << 10,
    'SEND_MESSAGES': 1 << 11,
    'SEND_TTS_MESSAGES': 1 << 12,
    'MANAGE_MESSAGES': 1 << 13,
    'EMBED_LINKS': 1 << 14,
    'ATTACH_FILES': 1 << 15,
    'READ_MESSAGE_HISTORY': 1 << 16,
    'MENTION_EVERYONE': 1 << 17,
    'USE_EXTERNAL_EMOJIS': 1 << 18,
    'VIEW_GUILD_INSIGHTS': 1 << 19,
    'CONNECT': 1 << 20,
    'SPEAK': 1 << 21,
    'MUTE_MEMBERS': 1 << 22,
    'DEAFEN_MEMBERS': 1 << 23,
    'MOVE_MEMBERS': 1 << 24,
    'USE_VAD': 1 << 25,
    'CHANGE_NICKNAME': 1 << 26,
    'MANAGE_NICKNAMES': 1 << 27,
    'MANAGE_ROLES': 1 << 28,
    'MANAGE_WEBHOOKS': 1 << 29,
    'MANAGE_EMOJIS_AND_STICKERS': 1 << 30,
    'USE_APPLICATION_COMMANDS': 1 << 31,
    'REQUEST_TO_SPEAK': 1 << 32,
    'MANAGE_EVENTS': 1 << 33,
    'MANAGE_THREADS': 1 << 34,
    'CREATE_PUBLIC_THREADS': 1 << 35,
    'CREATE_PRIVATE_THREADS': 1 << 36,
    'USE_EXTERNAL_STICKERS': 1 << 37,
    'SEND_MESSAGES_IN_THREADS': 1 << 38,
    'USE_EMBEDDED_ACTIVITIES': 1 << 39,
    'MODERATE_MEMBERS': 1 << 40
  };
  
  let value = 0n;
  for (const permission of permissions) {
    if (permissionMap[permission] !== undefined) {
      value |= BigInt(permissionMap[permission]);
    }
  }
  
  return value.toString();
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});