import { Interaction, ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { logger } from '../common/logger';
import { kalturaClient } from '../services/kalturaClient';
import { userAuthService } from '../services/userAuthService';
import { handleShareMeeting } from './commandHandlers';

/**
 * Handle Discord interactions (slash commands, buttons, etc.)
 */
export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleCommandInteraction(interaction);
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
      return;
    }

    // Handle other interaction types as needed
    logger.debug(`Unhandled interaction type: ${interaction.type}`);
  } catch (error) {
    logger.error('Error handling interaction', { error, interactionId: interaction.id });
    
    // Respond to the user if we haven't already
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle slash command interactions
 */
async function handleCommandInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const { client, commandName } = interaction;
  
  // Get the command from the client's commands collection
  const command = client.commands.get(commandName);
  
  if (!command) {
    logger.warn(`Command not found: ${commandName}`);
    await interaction.reply({
      content: `Command not found: ${commandName}`,
      ephemeral: true
    });
    return;
  }
  
  logger.info(`Executing command: ${commandName}`, {
    user: interaction.user.tag,
    guild: interaction.guild?.name || 'DM',
    channel: interaction.channel?.id
  });
  
  // Execute the command
  await command.execute(interaction);
}

/**
 * Handle button interactions
 */
async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId } = interaction;
  
  logger.info(`Button clicked: ${customId}`, {
    user: interaction.user.tag,
    guild: interaction.guild?.name || 'DM',
    channel: interaction.channel?.id
  });
  
  // Handle different button types based on customId
  if (customId.startsWith('join_meeting_')) {
    const meetingId = customId.replace('join_meeting_', '');
    await handleJoinMeeting(interaction, meetingId);
    return;
  }
  
  if (customId.startsWith('end_meeting_')) {
    const meetingId = customId.replace('end_meeting_', '');
    await handleEndMeeting(interaction, meetingId);
    return;
  }
  
  if (customId.startsWith('share_meeting_')) {
    const meetingId = customId.replace('share_meeting_', '');
    await handleShareMeetingButton(interaction, meetingId);
    return;
  }
  
  // Unknown button
  logger.warn(`Unknown button customId: ${customId}`);
  await interaction.reply({
    content: 'This button is not yet implemented or is no longer valid.',
    ephemeral: true
  });
}

/**
 * Handle join meeting button click
 */
async function handleJoinMeeting(interaction: ButtonInteraction, meetingId: string): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Map Discord user to Kaltura user
    const discordUser = {
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
    const mappedUser = await userAuthService.mapDiscordUserToKaltura(discordUser);
    
    // Get the meeting
    const meeting = await kalturaClient.getMeeting(meetingId);
    
    // Generate join URL for the user
    const joinUrl = await userAuthService.generateMeetingJoinUrl(meeting.id, mappedUser);
    
    // Send the response with the join URL
    await interaction.editReply({
      content: `You can join the ${meeting.type} "${meeting.title}" now:`,
      components: [{
        type: 1, // Action Row
        components: [{
          type: 2, // Button
          style: 5, // Link
          label: 'Join Now',
          url: joinUrl
        }]
      }]
    });
    
    logger.info('User joining meeting via button', {
      user: interaction.user.tag,
      meetingId
    });
  } catch (error) {
    logger.error('Error handling join meeting button', { error, meetingId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to join meeting. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to join meeting. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle end meeting button click
 */
async function handleEndMeeting(interaction: ButtonInteraction, meetingId: string): Promise<void> {
  try {
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get the meeting first to check if it exists and get its details
    const meeting = await kalturaClient.getMeeting(meetingId);
    
    // End the meeting
    await kalturaClient.endMeeting(meetingId);
    
    // Send the response
    await interaction.editReply({
      content: `The ${meeting.type} "${meeting.title}" has been ended successfully.`
    });
    
    logger.info('Meeting ended via button', {
      user: interaction.user.tag,
      meetingId
    });
  } catch (error) {
    logger.error('Error handling end meeting button', { error, meetingId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to end meeting. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to end meeting. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle share meeting button click
 */
async function handleShareMeetingButton(interaction: ButtonInteraction, meetingId: string): Promise<void> {
  try {
    // Convert ButtonInteraction to ChatInputCommandInteraction for compatibility with handleShareMeeting
    // This is a workaround since our handler expects a ChatInputCommandInteraction
    await handleShareMeeting(interaction as unknown as ChatInputCommandInteraction, meetingId);
  } catch (error) {
    logger.error('Error handling share meeting button', { error, meetingId });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Failed to share meeting. Please try again later.',
        ephemeral: true
      });
    }
  }
}