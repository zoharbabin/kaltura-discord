import { ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../common/logger';
import { kalturaClient, Meeting, MeetingCreateParams } from '../services/kalturaClient';
import { userAuthService, DiscordUser } from '../services/userAuthService';
import { configService } from '../services/configService';

/**
 * Handle the kaltura-start command
 * Creates a new Kaltura meeting
 */
export async function handleStartCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get command options
    const meetingType = interaction.options.getString('type', true) as 'webinar' | 'meeting' | 'classroom';
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description');
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Map Discord user to Kaltura user with server-specific role mapping
    const discordUser: DiscordUser = {
      id: interaction.user.id,
      username: interaction.user.username,
      discriminator: interaction.user.discriminator || undefined,
      avatar: interaction.user.avatar || undefined,
      roles: interaction.member?.roles ?
        Array.from(
          // Cast to any to avoid TypeScript errors with roles
          (interaction.member.roles as any).cache.values()
        ).map(role => (role as any).name) :
        undefined
    };
    
    // Get server-specific configuration for command permissions
    const config = await configService.getServerConfig(serverId);
    
    // Check if commands are enabled for this server
    if (!config.commands.enabled) {
      await interaction.editReply({
        content: 'Kaltura commands are disabled for this server.'
      });
      return;
    }
    
    // Check if user has permission to use this command
    const userRoles = discordUser.roles || [];
    const requiredRoles = config.commands.permissions['kaltura-start'] || ['@everyone'];
    
    // If @everyone is not in the required roles, check if user has any of the required roles
    if (!requiredRoles.includes('@everyone')) {
      const hasPermission = userRoles.some(role =>
        requiredRoles.some(requiredRole =>
          role.toLowerCase() === requiredRole.toLowerCase()
        )
      );
      
      if (!hasPermission) {
        await interaction.editReply({
          content: 'You do not have permission to use this command.'
        });
        return;
      }
    }
    
    // Map Discord user to Kaltura user with server-specific role mapping
    const mappedUser = await userAuthService.mapDiscordUserToKaltura(discordUser, serverId);
    
    // Create meeting parameters
    const meetingParams: MeetingCreateParams = {
      title,
      description: description || undefined,
      type: meetingType,
      ownerId: mappedUser.kalturaUserId,
    };
    
    // Create the meeting
    logger.info('Creating Kaltura meeting', {
      user: interaction.user.tag,
      meetingType,
      title
    });
    
    const meeting = await kalturaClient.createMeeting(meetingParams);
    
    // Generate join URL for the creator
    const joinUrl = await userAuthService.generateMeetingJoinUrl(meeting.id, mappedUser);
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle(`${capitalizeFirstLetter(meeting.type || 'meeting')} Created: ${meeting.title || 'Untitled'}`)
      .setDescription(meeting.description || 'No description provided');
      
    // Add fields with validation to prevent undefined values
    const fields = [];
    if (meeting.id) fields.push({ name: 'Meeting ID', value: meeting.id, inline: true });
    if (interaction.user?.username) fields.push({ name: 'Created by', value: interaction.user.username, inline: true });
    if (meeting.type) fields.push({ name: 'Type', value: capitalizeFirstLetter(meeting.type), inline: true });
    
    if (fields.length > 0) {
      embed.addFields(...fields);
    }
    
    embed.setTimestamp()
      .setFooter({ text: 'Kaltura Meeting' });
    
    // Create buttons for the response
    const joinButton = new ButtonBuilder()
      .setCustomId(`join_meeting_${meeting.id}`)
      .setLabel('Join Meeting')
      .setStyle(ButtonStyle.Primary);
    
    const shareButton = new ButtonBuilder()
      .setCustomId(`share_meeting_${meeting.id}`)
      .setLabel('Share with Channel')
      .setStyle(ButtonStyle.Secondary);
    
    const endButton = new ButtonBuilder()
      .setCustomId(`end_meeting_${meeting.id}`)
      .setLabel('End Meeting')
      .setStyle(ButtonStyle.Danger);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(joinButton, shareButton, endButton);
    
    // Send the response to the user
    await interaction.editReply({
      content: `Your ${meeting.type} has been created! You can join it now:`,
      embeds: [embed],
      components: [row]
    });
    
    logger.info('Kaltura meeting created successfully', { 
      user: interaction.user.tag, 
      meetingId: meeting.id 
    });
  } catch (error) {
    // Create a more detailed error message
    const errorMessage = error instanceof Error
      ? `Error handling kaltura-start command: ${error.message}`
      : 'Error handling kaltura-start command: Unknown error';
    
    logger.error(errorMessage, { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to create meeting. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to create meeting. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle the kaltura-join command
 * Joins an existing Kaltura meeting
 */
export async function handleJoinCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get command options
    const meetingId = interaction.options.getString('meeting-id', true);
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Map Discord user to Kaltura user
    const discordUser: DiscordUser = {
      id: interaction.user.id,
      username: interaction.user.username,
      discriminator: interaction.user.discriminator || undefined,
      avatar: interaction.user.avatar || undefined,
      roles: interaction.member?.roles ?
        Array.from(
          // Cast to any to avoid TypeScript errors with roles
          (interaction.member.roles as any).cache.values()
        ).map(role => (role as any).name) :
        undefined
    };
    
    // Get server-specific configuration for command permissions
    const config = await configService.getServerConfig(serverId);
    
    // Check if commands are enabled for this server
    if (!config.commands.enabled) {
      await interaction.editReply({
        content: 'Kaltura commands are disabled for this server.'
      });
      return;
    }
    
    // Check if user has permission to use this command
    const userRoles = discordUser.roles || [];
    const requiredRoles = config.commands.permissions['kaltura-join'] || ['@everyone'];
    
    // If @everyone is not in the required roles, check if user has any of the required roles
    if (!requiredRoles.includes('@everyone')) {
      const hasPermission = userRoles.some(role =>
        requiredRoles.some(requiredRole =>
          role.toLowerCase() === requiredRole.toLowerCase()
        )
      );
      
      if (!hasPermission) {
        await interaction.editReply({
          content: 'You do not have permission to use this command.'
        });
        return;
      }
    }
    
    // Map Discord user to Kaltura user with server-specific role mapping
    const mappedUser = await userAuthService.mapDiscordUserToKaltura(discordUser, serverId);
    
    // Get the meeting
    logger.info('Joining Kaltura meeting', { 
      user: interaction.user.tag, 
      meetingId 
    });
    
    const meeting = await kalturaClient.getMeeting(meetingId);
    
    // Generate join URL for the user
    const joinUrl = await userAuthService.generateMeetingJoinUrl(meeting.id, mappedUser);
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle(`Join ${capitalizeFirstLetter(meeting.type || 'meeting')}: ${meeting.title || 'Untitled'}`)
      .setDescription(meeting.description || 'No description provided');
      
    // Add fields with validation to prevent undefined values
    const fields = [];
    if (meeting.id) fields.push({ name: 'Meeting ID', value: meeting.id, inline: true });
    if (meeting.type) fields.push({ name: 'Type', value: capitalizeFirstLetter(meeting.type), inline: true });
    
    if (fields.length > 0) {
      embed.addFields(...fields);
    }
    
    embed.setTimestamp()
      .setFooter({ text: 'Kaltura Meeting' });
    
    // Create button for the join URL
    const joinButton = new ButtonBuilder()
      .setLabel('Join Now')
      .setURL(joinUrl)
      .setStyle(ButtonStyle.Link);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(joinButton);
    
    // Send the response to the user
    await interaction.editReply({
      content: `You can join the ${meeting.type} now:`,
      embeds: [embed],
      components: [row]
    });
    
    logger.info('Kaltura meeting join URL generated', { 
      user: interaction.user.tag, 
      meetingId: meeting.id 
    });
  } catch (error) {
    // Create a more detailed error message
    const errorMessage = error instanceof Error
      ? `Error handling kaltura-join command: ${error.message}`
      : 'Error handling kaltura-join command: Unknown error';
    
    logger.error(errorMessage, { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to join meeting. Please check the meeting ID and try again.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to join meeting. Please check the meeting ID and try again.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle the kaltura-list command
 * Lists all active Kaltura meetings for the server
 */
export async function handleListCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: false });
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Get server-specific configuration for command permissions
    const config = await configService.getServerConfig(serverId);
    
    // Check if commands are enabled for this server
    if (!config.commands.enabled) {
      await interaction.editReply({
        content: 'Kaltura commands are disabled for this server.'
      });
      return;
    }
    
    // Check if user has permission to use this command
    const discordUser: DiscordUser = {
      id: interaction.user.id,
      username: interaction.user.username,
      discriminator: interaction.user.discriminator || undefined,
      avatar: interaction.user.avatar || undefined,
      roles: interaction.member?.roles ?
        Array.from(
          // Cast to any to avoid TypeScript errors with roles
          (interaction.member.roles as any).cache.values()
        ).map(role => (role as any).name) :
        undefined
    };
    
    const userRoles = discordUser.roles || [];
    const requiredRoles = config.commands.permissions['kaltura-list'] || ['@everyone'];
    
    // If @everyone is not in the required roles, check if user has any of the required roles
    if (!requiredRoles.includes('@everyone')) {
      const hasPermission = userRoles.some(role =>
        requiredRoles.some(requiredRole =>
          role.toLowerCase() === requiredRole.toLowerCase()
        )
      );
      
      if (!hasPermission) {
        await interaction.editReply({
          content: 'You do not have permission to use this command.'
        });
        return;
      }
    }
    
    // Get all active meetings
    logger.info('Listing Kaltura meetings', {
      user: interaction.user.tag,
      guild: interaction.guild?.name || 'DM'
    });
    
    const meetings = await kalturaClient.listMeetings();
    
    if (meetings.length === 0) {
      await interaction.editReply({
        content: 'There are no active Kaltura meetings at the moment.'
      });
      return;
    }
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle('Active Kaltura Meetings')
      .setDescription(`Found ${meetings.length} active meetings`)
      .setTimestamp()
      .setFooter({ text: 'Kaltura Meetings' });
    
    // Add each meeting to the embed
    meetings.forEach((meeting, index) => {
      embed.addFields({
        name: `${index + 1}. ${meeting.title} (${capitalizeFirstLetter(meeting.type)})`,
        value: `ID: ${meeting.id}\nCreated: ${meeting.createdAt.toLocaleString()}`
      });
    });
    
    // Create buttons for each meeting
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    
    for (let i = 0; i < Math.min(meetings.length, 5); i++) {
      const meeting = meetings[i];
      
      const joinButton = new ButtonBuilder()
        .setCustomId(`join_meeting_${meeting.id}`)
        .setLabel(`Join ${i + 1}`)
        .setStyle(ButtonStyle.Primary);
      
      const endButton = new ButtonBuilder()
        .setCustomId(`end_meeting_${meeting.id}`)
        .setLabel(`End ${i + 1}`)
        .setStyle(ButtonStyle.Danger);
      
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(joinButton, endButton);
      
      rows.push(row);
    }
    
    // Send the response
    await interaction.editReply({
      embeds: [embed],
      components: rows
    });
    
    logger.info('Kaltura meetings listed successfully', { 
      user: interaction.user.tag, 
      count: meetings.length 
    });
  } catch (error) {
    // Create a more detailed error message
    const errorMessage = error instanceof Error
      ? `Error handling kaltura-list command: ${error.message}`
      : 'Error handling kaltura-list command: Unknown error';
    
    logger.error(errorMessage, { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to list meetings. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to list meetings. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle the kaltura-end command
 * Ends a Kaltura meeting
 */
export async function handleEndCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get command options
    const meetingId = interaction.options.getString('meeting-id', true);
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Get server-specific configuration for command permissions
    const config = await configService.getServerConfig(serverId);
    
    // Check if commands are enabled for this server
    if (!config.commands.enabled) {
      await interaction.editReply({
        content: 'Kaltura commands are disabled for this server.'
      });
      return;
    }
    
    // Check if user has permission to use this command
    const discordUser: DiscordUser = {
      id: interaction.user.id,
      username: interaction.user.username,
      discriminator: interaction.user.discriminator || undefined,
      avatar: interaction.user.avatar || undefined,
      roles: interaction.member?.roles ?
        Array.from(
          // Cast to any to avoid TypeScript errors with roles
          (interaction.member.roles as any).cache.values()
        ).map(role => (role as any).name) :
        undefined
    };
    
    const userRoles = discordUser.roles || [];
    const requiredRoles = config.commands.permissions['kaltura-end'] || ['@everyone'];
    
    // If @everyone is not in the required roles, check if user has any of the required roles
    if (!requiredRoles.includes('@everyone')) {
      const hasPermission = userRoles.some(role =>
        requiredRoles.some(requiredRole =>
          role.toLowerCase() === requiredRole.toLowerCase()
        )
      );
      
      if (!hasPermission) {
        await interaction.editReply({
          content: 'You do not have permission to use this command.'
        });
        return;
      }
    }
    
    // End the meeting
    logger.info('Ending Kaltura meeting', {
      user: interaction.user.tag,
      meetingId
    });
    
    // Get the meeting first to check if it exists and get its details
    const meeting = await kalturaClient.getMeeting(meetingId);
    
    // End the meeting
    await kalturaClient.endMeeting(meetingId);
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle(`${capitalizeFirstLetter(meeting.type || 'meeting')} Ended: ${meeting.title || 'Untitled'}`)
      .setDescription('This meeting has been ended successfully.');
      
    // Add fields with validation to prevent undefined values
    const fields = [];
    if (meeting.id) fields.push({ name: 'Meeting ID', value: meeting.id, inline: true });
    if (interaction.user?.username) fields.push({ name: 'Ended by', value: interaction.user.username, inline: true });
    if (meeting.type) fields.push({ name: 'Type', value: capitalizeFirstLetter(meeting.type), inline: true });
    
    if (fields.length > 0) {
      embed.addFields(...fields);
    }
    
    embed.setTimestamp()
      .setFooter({ text: 'Kaltura Meeting' });
    
    // Send the response to the user
    await interaction.editReply({
      embeds: [embed]
    });
    
    logger.info('Kaltura meeting ended successfully', { 
      user: interaction.user.tag, 
      meetingId: meeting.id 
    });
  } catch (error) {
    // Create a more detailed error message
    const errorMessage = error instanceof Error
      ? `Error handling kaltura-end command: ${error.message}`
      : 'Error handling kaltura-end command: Unknown error';
    
    logger.error(errorMessage, { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to end meeting. Please check the meeting ID and try again.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to end meeting. Please check the meeting ID and try again.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle the share meeting button click
 * Shares a meeting with the channel
 */
export async function handleShareMeeting(interaction: ChatInputCommandInteraction, meetingId: string): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: false });
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Get server-specific configuration for notification templates
    const config = await configService.getServerConfig(serverId);
    
    // Get the meeting
    const meeting = await kalturaClient.getMeeting(meetingId);
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle(`Join ${capitalizeFirstLetter(meeting.type)}: ${meeting.title}`)
      .setDescription(meeting.description || 'No description provided')
      .addFields(
        { name: 'Meeting ID', value: meeting.id, inline: true },
        { name: 'Type', value: capitalizeFirstLetter(meeting.type), inline: true },
        { name: 'Shared by', value: interaction.user.username, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Kaltura Meeting' });
    
    // Create button for joining
    const joinButton = new ButtonBuilder()
      .setCustomId(`join_meeting_${meeting.id}`)
      .setLabel('Join Meeting')
      .setStyle(ButtonStyle.Primary);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(joinButton);
    
    // Use notification template from configuration if available
    let notificationContent = `@here ${interaction.user.username} is inviting you to join a Kaltura ${meeting.type}:`;
    
    // Check if there's a template for meeting_share in the configuration
    if (config.notifications.templates && config.notifications.templates['meeting_share']) {
      // Replace variables in the template
      let template = config.notifications.templates['meeting_share'];
      template = template.replace(/{{username}}/g, interaction.user.username);
      template = template.replace(/{{title}}/g, meeting.title);
      template = template.replace(/{{type}}/g, meeting.type);
      template = template.replace(/{{id}}/g, meeting.id);
      
      notificationContent = template;
    }
    
    // Send the response to the channel
    await interaction.editReply({
      content: notificationContent,
      embeds: [embed],
      components: [row]
    });
    
    logger.info('Kaltura meeting shared with channel', { 
      user: interaction.user.tag, 
      meetingId: meeting.id,
      channel: interaction.channelId
    });
  } catch (error) {
    logger.error('Error handling share meeting', { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to share meeting. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to share meeting. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle the kaltura-config-view command
 * Shows the current configuration for the server
 */
export async function handleConfigViewCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get server ID
    const serverId = interaction.guildId || 'default';
    
    // Check if user has admin permissions
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.editReply({
        content: 'You need administrator permissions to view the configuration.'
      });
      return;
    }
    
    // Get the configuration section to view
    const section = interaction.options.getString('section') || 'all';
    
    // Get the server configuration
    const config = await configService.getServerConfig(serverId);
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle('Kaltura Configuration')
      .setDescription(`Configuration for server: ${interaction.guild?.name || 'Default'}`)
      .setTimestamp()
      .setFooter({ text: 'Kaltura Configuration' });
    
    // Add configuration sections based on the selected section
    if (section === 'all' || section === 'notifications') {
      embed.addFields({
        name: 'Notifications',
        value: '```json\n' + JSON.stringify(config.notifications, null, 2) + '\n```'
      });
    }
    
    if (section === 'all' || section === 'commands') {
      embed.addFields({
        name: 'Commands',
        value: '```json\n' + JSON.stringify(config.commands, null, 2) + '\n```'
      });
    }
    
    if (section === 'all' || section === 'roles') {
      embed.addFields({
        name: 'Roles',
        value: '```json\n' + JSON.stringify(config.roles, null, 2) + '\n```'
      });
    }
    
    if (section === 'all' || section === 'features') {
      embed.addFields({
        name: 'Features',
        value: '```json\n' + JSON.stringify(config.features, null, 2) + '\n```'
      });
    }
    
    // Send the response
    await interaction.editReply({
      embeds: [embed]
    });
    
    logger.info('Configuration viewed', {
      user: interaction.user.tag,
      serverId,
      section
    });
  } catch (error) {
    // Create a more detailed error message
    const errorMessage = error instanceof Error
      ? `Error handling kaltura-config-view command: ${error.message}`
      : 'Error handling kaltura-config-view command: Unknown error';
    
    logger.error(errorMessage, { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to view configuration. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to view configuration. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle the kaltura-config-update command
 * Updates the configuration for the server
 */
export async function handleConfigUpdateCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get server ID
    const serverId = interaction.guildId || 'default';
    
    // Check if user has admin permissions
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.editReply({
        content: 'You need administrator permissions to update the configuration.'
      });
      return;
    }
    
    // Get the configuration section, key, and value
    const section = interaction.options.getString('section', true);
    const key = interaction.options.getString('key', true);
    const value = interaction.options.getString('value', true);
    
    // Get the current server configuration
    const config = await configService.getServerConfig(serverId);
    
    // Parse the key path (e.g., "notifications.enabled" or "roles.mapping.admin")
    const keyPath = key.split('.');
    
    // Create a partial configuration object with the new value
    const updateConfig: any = {};
    let currentLevel = updateConfig;
    
    // Build the nested object structure
    for (let i = 0; i < keyPath.length - 1; i++) {
      currentLevel[keyPath[i]] = {};
      currentLevel = currentLevel[keyPath[i]];
    }
    
    // Set the value at the deepest level
    // Try to parse the value as JSON if possible
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch (e) {
      // If not valid JSON, use the string value
      parsedValue = value;
    }
    
    currentLevel[keyPath[keyPath.length - 1]] = parsedValue;
    
    // Validate the update
    if (!validateConfigUpdate(section, keyPath, parsedValue)) {
      await interaction.editReply({
        content: 'Invalid configuration update. Please check the key and value.'
      });
      return;
    }
    
    // Save the updated configuration
    await configService.saveServerConfig(serverId, updateConfig);
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle('Configuration Updated')
      .setDescription(`Updated configuration for server: ${interaction.guild?.name || 'Default'}`)
      .addFields(
        { name: 'Section', value: section, inline: true },
        { name: 'Key', value: key, inline: true },
        { name: 'New Value', value: '```' + value + '```' }
      )
      .setTimestamp()
      .setFooter({ text: 'Kaltura Configuration' });
    
    // Send the response
    await interaction.editReply({
      embeds: [embed]
    });
    
    logger.info('Configuration updated', {
      user: interaction.user.tag,
      serverId,
      section,
      key,
      value
    });
  } catch (error) {
    // Create a more detailed error message
    const errorMessage = error instanceof Error
      ? `Error handling kaltura-config-update command: ${error.message}`
      : 'Error handling kaltura-config-update command: Unknown error';
    
    logger.error(errorMessage, { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to update configuration. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to update configuration. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle the kaltura-config-reset command
 * Resets the configuration for the server to defaults
 */
export async function handleConfigResetCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get server ID
    const serverId = interaction.guildId || 'default';
    
    // Check if user has admin permissions
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.editReply({
        content: 'You need administrator permissions to reset the configuration.'
      });
      return;
    }
    
    // Get the configuration section to reset
    const section = interaction.options.getString('section') || 'all';
    
    // Check if the user confirmed the reset
    const confirmed = interaction.options.getBoolean('confirm', true);
    
    if (!confirmed) {
      await interaction.editReply({
        content: 'Reset cancelled. Please confirm to reset the configuration.'
      });
      return;
    }
    
    // Reset the configuration
    if (section === 'all') {
      await configService.resetServerConfig(serverId);
    } else {
      await configService.resetServerConfig(serverId, section);
    }
    
    // Create embed for the response
    const embed = new EmbedBuilder()
      .setColor('#00B171') // Kaltura green
      .setTitle('Configuration Reset')
      .setDescription(`Reset configuration for server: ${interaction.guild?.name || 'Default'}`)
      .addFields(
        { name: 'Section', value: section, inline: true },
        { name: 'Status', value: 'Reset to defaults', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Kaltura Configuration' });
    
    // Send the response
    await interaction.editReply({
      embeds: [embed]
    });
    
    logger.info('Configuration reset', {
      user: interaction.user.tag,
      serverId,
      section
    });
  } catch (error) {
    // Create a more detailed error message
    const errorMessage = error instanceof Error
      ? `Error handling kaltura-config-reset command: ${error.message}`
      : 'Error handling kaltura-config-reset command: Unknown error';
    
    logger.error(errorMessage, { error });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to reset configuration. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to reset configuration. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Validates a configuration update
 * @param section Configuration section
 * @param keyPath Key path array
 * @param value New value
 * @returns True if the update is valid
 */
function validateConfigUpdate(section: string, keyPath: string[], value: any): boolean {
  // Basic validation based on section and key path
  switch (section) {
    case 'notifications':
      if (keyPath[0] !== 'notifications') return false;
      
      // Validate notifications.enabled (boolean)
      if (keyPath.length === 2 && keyPath[1] === 'enabled') {
        return typeof value === 'boolean';
      }
      
      // Validate notifications.types.* (boolean)
      if (keyPath.length === 3 && keyPath[1] === 'types') {
        return typeof value === 'boolean';
      }
      
      // Validate notifications.templates.* (string)
      if (keyPath.length === 3 && keyPath[1] === 'templates') {
        return typeof value === 'string';
      }
      
      // Validate notifications.channels.* (string)
      if (keyPath.length === 3 && keyPath[1] === 'channels') {
        return typeof value === 'string';
      }
      
      break;
      
    case 'commands':
      if (keyPath[0] !== 'commands') return false;
      
      // Validate commands.enabled (boolean)
      if (keyPath.length === 2 && keyPath[1] === 'enabled') {
        return typeof value === 'boolean';
      }
      
      // Validate commands.prefix (string)
      if (keyPath.length === 2 && keyPath[1] === 'prefix') {
        return typeof value === 'string';
      }
      
      // Validate commands.permissions.* (array of strings)
      if (keyPath.length === 3 && keyPath[1] === 'permissions') {
        return Array.isArray(value) && value.every(item => typeof item === 'string');
      }
      
      break;
      
    case 'roles':
      if (keyPath[0] !== 'roles') return false;
      
      // Validate roles.mapping.* (string)
      if (keyPath.length === 3 && keyPath[1] === 'mapping') {
        return typeof value === 'string';
      }
      
      break;
      
    case 'features':
      if (keyPath[0] !== 'features') return false;
      
      // Validate features.* (boolean)
      if (keyPath.length === 2) {
        return typeof value === 'boolean';
      }
      
      break;
  }
  
  // If no specific validation rule matched, return false
  return false;
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}