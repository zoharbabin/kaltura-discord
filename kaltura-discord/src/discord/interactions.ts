import { Interaction, ChatInputCommandInteraction, ButtonInteraction, GuildMember } from 'discord.js';
import { getEnv } from '../common/envService';
import { logger } from '../common/logger';
import { kalturaClient } from '../services/kalturaClient';
import { userAuthService } from '../services/userAuthService';
import { configService } from '../services/configService';
import { launchKalturaVideoActivity, launchDiscordActivity } from './kalturaActivity';
import {
  handleShareMeeting,
  handleStartCommand,
  handleJoinCommand,
  handleListCommand,
  handleEndCommand,
  handleConfigViewCommand,
  handleConfigUpdateCommand,
  handleConfigResetCommand,
  handleVideoSearchCommand,
  handleGetKSCommand
} from './commandHandlers';

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
  const { commandName } = interaction;
  
  logger.info(`Executing command: ${commandName}`, {
    user: interaction.user.tag,
    guild: interaction.guild?.name || 'DM',
    channel: interaction.channel?.id
  });
  
  // Handle each command type
  switch (commandName) {
    case 'kaltura-start':
      await handleStartCommand(interaction);
      break;
    case 'kaltura-join':
      await handleJoinCommand(interaction);
      break;
    case 'kaltura-list':
      await handleListCommand(interaction);
      break;
    case 'kaltura-end':
      await handleEndCommand(interaction);
      break;
    case 'kaltura-config-view':
      await handleConfigViewCommand(interaction);
      break;
    case 'kaltura-config-update':
      await handleConfigUpdateCommand(interaction);
      break;
    case 'kaltura-config-reset':
      await handleConfigResetCommand(interaction);
      break;
    case 'kaltura-video-search':
      await handleVideoSearchCommand(interaction);
      break;
    case 'kaltura-get-ks':
      await handleGetKSCommand(interaction);
      break;
    default:
      logger.warn(`Command not found: ${commandName}`);
      await interaction.reply({
        content: `Command not found: ${commandName}`,
        ephemeral: true
      });
  }
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

  // Handle video-related buttons
  if (customId.startsWith('play_video_')) {
    const videoId = customId.replace('play_video_', '');
    await handlePlayVideo(interaction, videoId);
    return;
  }
  
  if (customId.startsWith('embed_video_')) {
    const videoId = customId.replace('embed_video_', '');
    await handleEmbedVideo(interaction, videoId);
    return;
  }
  
  if (customId.startsWith('activity_video_')) {
    const videoId = customId.replace('activity_video_', '');
    // Share the video with the channel with rich embed and watch options
    await launchKalturaVideoActivity(interaction, videoId);
    return;
  }
  // Handle Discord Activity button
  if (customId.startsWith('discord_activity_')) {
    const videoId = customId.replace('discord_activity_', '');
    await launchDiscordActivity(interaction, videoId);
    return;
  }

  // Handle Join Activity button
  if (customId.startsWith('join_activity_')) {
    const videoId = customId.replace('join_activity_', '');
    await handleJoinActivity(interaction, videoId);
    return;
  }
// Handle Watch Together button
if (customId.startsWith('watch_together_')) {
  const videoId = customId.replace('watch_together_', '');
  await handleWatchTogether(interaction, videoId);
  return;
}

// Handle video details button
if (customId.startsWith('inline_activity_')) {
  const videoId = customId.replace('inline_activity_', '');
  await handleInlineActivity(interaction, videoId);
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

/**
 * Handle play video button click
 */
async function handlePlayVideo(interaction: ButtonInteraction, videoId: string): Promise<void> {
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
    
    // Get the video
    const video = await kalturaClient.getVideo(videoId);
    
    // Generate play URL for the user
    const playUrl = await kalturaClient.generateVideoPlayUrl(video.id, mappedUser.kalturaUserId);
    
    // Extract partner ID and player ID for reference and embed codes
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const uiconfIdMatch = video.playUrl.match(/uiconf_id\/(\d+)/);
    
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    const uiconfId = uiconfIdMatch ? uiconfIdMatch[1] : '';
    
    // Create a rich embed with video details and large thumbnail
    const embed = {
      title: video.title,
      description: video.description || 'No description provided',
      color: 0x00B171, // Kaltura green
      fields: [
        { name: 'Duration', value: formatDuration(video.duration), inline: true },
        { name: 'Views', value: video.views.toString(), inline: true },
        { name: 'Created', value: new Date(video.createdAt).toLocaleDateString(), inline: true }
      ],
      image: { url: video.thumbnailUrl }, // Use full-size image instead of thumbnail
      footer: { text: 'Kaltura Video Player' }
    };
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Get server-specific configuration for video embed URL
    const config = await configService.getServerConfig(serverId);
    
    // Get the embed base URL from configuration or use default
    const embedBaseUrl = config.kaltura?.video?.embedBaseUrl || 'https://hackerspacelive.events.kaltura.com/media/t/';
    
    // Create the embed URL for the video
    const embedUrl = `${embedBaseUrl}${video.id}`;
    
    // Create a mobile-optimized embed with essential video details
    const videoEmbed = {
      title: video.title,
      // Keep description brief for mobile
      description: video.description ?
        (video.description.length > 100 ? video.description.substring(0, 100) + '...' : video.description) :
        'No description provided',
      color: 0x00B171, // Kaltura green
      // Combine fields into fewer lines for mobile
      fields: [
        {
          name: 'Video Info',
          value: `⏱️ \`${formatDuration(video.duration)}\` • 👁️ ${video.views} views • 📅 ${new Date(video.createdAt).toLocaleDateString()}`,
          inline: false
        }
      ],
      footer: { text: `Kaltura Video • ID: ${video.id}` },
      // Use thumbnail instead of full image for mobile
      thumbnail: {
        url: video.thumbnailUrl
      },
      // Add URL to make the title clickable
      url: embedUrl
    };
    
    // Create a mobile-optimized row with compact buttons
    const actionRow = {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 5, // Link
          label: '▶️ Play',
          url: embedUrl
        },
        {
          type: 2, // Button
          style: 2, // Secondary
          label: '📋 Embed Code',
          custom_id: `embed_video_${video.id}`
        },
        {
          type: 2, // Button
          style: 1, // Primary
          label: '📢 Share to Channel',
          custom_id: `activity_video_${video.id}`
        },
      ]
    };
    
    // Send the enhanced response with a single row of buttons
    await interaction.editReply({
      content: null, // Remove content since we have a rich embed
      embeds: [videoEmbed],
      components: [actionRow]
    });
    
    logger.info('User playing video via button', {
      user: interaction.user.tag,
      videoId
    });
  } catch (error) {
    logger.error('Error handling play video button', { error, videoId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to play video. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to play video. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle embed video button click
 * Provides embed code for the video
 */
async function handleEmbedVideo(interaction: ButtonInteraction, videoId: string): Promise<void> {
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
    
    // Get the video
    const video = await kalturaClient.getVideo(videoId);
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Get server-specific configuration for video embed URL
    const config = await configService.getServerConfig(serverId);
    
    // Get the embed base URL from configuration or use default
    const embedBaseUrl = config.kaltura?.video?.embedBaseUrl || 'https://hackerspacelive.events.kaltura.com/media/t/';
    
    // Create the embed URL for the video
    const embedUrl = `${embedBaseUrl}${video.id}`;
    
    // Extract partner ID and player ID for embed codes
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const uiconfIdMatch = video.playUrl.match(/uiconf_id\/(\d+)/);
    
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    const uiconfId = uiconfIdMatch ? uiconfIdMatch[1] : '';
    
    // Create iframe embed code
    const iframeEmbed = `<iframe src="https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}?iframeembed=true&entry_id=${video.id}" style="width: 854px; height: 480px" allowfullscreen frameborder="0"></iframe>`;
    
    // Create JavaScript embed code
    const playerInstanceId = Math.floor(Math.random() * 1000000000);
    const jsEmbedCode = `<div id="kaltura_player_${playerInstanceId}" style="width: 854px;height: 480px"></div>
<script type="text/javascript" src="https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}"></script>
<script type="text/javascript">
try {
  var kalturaPlayer = KalturaPlayer.setup({
    targetId: "kaltura_player_${playerInstanceId}",
    provider: {
      partnerId: ${partnerId},
      uiConfId: ${uiconfId}
    }
  });
  kalturaPlayer.loadMedia({entryId: '${video.id}'});
} catch (e) {
  console.error(e.message);
}
</script>`;
    
    // Create direct embed link
    const directEmbedLink = `<a href="${embedUrl}" target="_blank">Watch on Kaltura</a>`;
    
    // Create a mobile-optimized embed for the embed codes
    const embedCodeEmbed = {
      title: `Embed Codes: ${video.title}`,
      description: `🔗 **Direct Link:**\n${embedUrl}`,
      color: 0x00B171, // Kaltura green
      fields: [
        {
          name: '📄 IFrame Embed',
          value: `\`\`\`html\n${iframeEmbed.length > 200 ? iframeEmbed.substring(0, 200) + '...' : iframeEmbed}\n\`\`\``
        }
        // Removed JavaScript embed to save space on mobile
      ],
      footer: { text: `Kaltura Video • ID: ${video.id}` },
      thumbnail: {
        url: video.thumbnailUrl
      }
    };
    
    // Create a single row with multiple buttons for better organization
    const actionRow = {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 5, // Link
          label: '🔗 Open',
          url: embedUrl
        },
        {
          type: 2, // Button
          style: 5, // Link
          label: '📺 Preview',
          url: `${embedUrl}?fullScreen=true`
        },
        {
          type: 2, // Button
          style: 1, // Primary
          label: '📺 Watch Inline Activity',
          custom_id: `inline_activity_${video.id}`
        }
      ]
    };
    
    // Send the enhanced response with embed codes
    await interaction.editReply({
      embeds: [embedCodeEmbed],
      components: [actionRow]
    });
    
    logger.info('User requested embed code for video', {
      user: interaction.user.tag,
      videoId
    });
  } catch (error) {
    logger.error('Error handling embed video button', { error, videoId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to get embed code. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to get embed code. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle video details button click
 * Provides direct video link, embed code, and activity option if available
 */
async function handleInlineActivity(interaction: ButtonInteraction, videoId: string): Promise<void> {
  try {
    // Defer reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get the video details
    const video = await kalturaClient.getVideo(videoId);
    
    // Extract partner ID and player ID for embed codes
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const uiconfIdMatch = video.playUrl.match(/uiconf_id\/(\d+)/);
    
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    const uiconfId = uiconfIdMatch ? uiconfIdMatch[1] : '';
    
    // Create the iframe embed code for the video
    const iframeEmbed = `<iframe type="text/javascript" src='https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}?iframeembed=true&entry_id=${video.id}' style="width: 854px; height: 480px" allowfullscreen webkitallowfullscreen mozAllowFullScreen allow="autoplay *; fullscreen *; encrypted-media *" frameborder="0"></iframe>`;
    
    // Create components array for buttons
    const components = [];
    
    // Add direct watch button
    const watchRow = {
      type: 1, // Action Row
      components: [{
        type: 2, // Button
        style: 5, // Link
        label: '▶️ Watch Video',
        url: `https://hackerspacelive.events.kaltura.com/media/t/${video.id}`
      }]
    };
    components.push(watchRow);
    
    // Create content message
    let contentMessage = `Here's the Kaltura video "${video.title}".\n\n`;
    contentMessage += `Click the button below to watch the video directly in your browser, or use this embed code elsewhere:\n\n\`\`\`html\n${iframeEmbed}\n\`\`\``;
    
    // Send the response with instructions and embed code
    await interaction.editReply({
      content: contentMessage,
      components: components
    });
    
    logger.info('User viewing video details', {
      user: interaction.user.tag,
      videoId
    });
  } catch (error) {
    logger.error('Error handling video display', { error, videoId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to display video information. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to display video information. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle search again button click
 * Prompts the user to enter a new search query
 */
async function handleSearchAgain(interaction: ButtonInteraction): Promise<void> {
  try {
    // Reply with a message to use the search command again
    await interaction.reply({
      content: 'To search again, use the `/kaltura-video-search` command with your new search term.',
      ephemeral: true
    });
    
    logger.info('User clicked search again button', {
      user: interaction.user.tag
    });
  } catch (error) {
    logger.error('Error handling search again button', { error });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Failed to process your request. Please try using the `/kaltura-video-search` command directly.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle Join Activity button click
 * Directly launches the Discord activity in the voice channel
 */
async function handleJoinActivity(interaction: ButtonInteraction, videoId: string): Promise<void> {
  try {
    // Defer reply to give us time to process
    await interaction.deferReply({ ephemeral: false });
    
    // Check if the user is in a voice channel
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
      await interaction.editReply({
        content: 'You need to be in a voice channel to join the Watch Together activity!'
      });
      return;
    }
    
    // Get the voice channel
    const voiceChannel = interaction.member.voice.channel;
    
    // Get the video details
    const video = await kalturaClient.getVideo(videoId);
    
    // Extract partner ID from the video play URL
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    
    // Get the uiConfID from environment variable
    const uiconfId = getEnv('KALTURA_PLAYER_ID', '46022343');
    
    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';
    
    // Get server-specific configuration
    const config = await configService.getServerConfig(serverId);
    
    // Get Discord application ID from configuration
    const applicationId = config.features?.discordApplicationId ||
                         getEnv('DISCORD_APPLICATION_ID', '');
    
    if (!applicationId) {
      logger.error('Discord application ID not configured', { serverId });
      await interaction.editReply({
        content: 'Discord Activity is not properly configured. Please contact the administrator.'
      });
      return;
    }
    
    // Create metadata for the activity
    const metadata = {
      videoId,
      partnerId,
      uiconfId,
      title: video.title,
      creatorId: interaction.user.id
    };
    
    // Get the Discord Activity base URL from environment variable first, then fall back to configuration
    const activityBaseUrl = getEnv('DISCORD_ACTIVITY_URL', '') ||
                           config.features?.discordActivityUrl as string ||
                           'https://discord.com/activities';
    
    // Create the Discord Activity URL
    const activityUrl = `${activityBaseUrl}/${applicationId}?metadata=${encodeURIComponent(JSON.stringify(metadata))}`;
    
    try {
      // For Discord Activities, we need to provide a button that links to the activity
      // Discord will handle launching the activity in the client when clicked
      
      await interaction.editReply({
        content: `${interaction.user} is joining the Watch Together activity for **${video.title}**!\n\nClick the button below to launch the activity:`,
        components: [{
          type: 1, // Action Row
          components: [{
            type: 2, // Button
            style: 5, // Link
            label: '🎬 Launch Watch Together Activity',
            // Use the standard HTTPS URL for the activity
            url: activityUrl
          }]
        }]
      });
      
      logger.info('User joining Discord Activity', {
        user: interaction.user.tag,
        videoId,
        voiceChannel: voiceChannel.name
      });
    } catch (error) {
      logger.error('Error launching Discord Activity directly', { error, videoId });
      
      // Fallback to the standard URL
      await interaction.editReply({
        content: 'Unable to launch the activity. Please use this link:',
        components: [{
          type: 1, // Action Row
          components: [{
            type: 2, // Button
            style: 5, // Link
            label: '🎬 Launch Watch Together Activity',
            url: activityUrl
          }]
        }]
      });
    }
  } catch (error) {
    logger.error('Error handling Join Activity button', { error, videoId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to join the activity. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to join the activity. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Handle Watch Together button click
 * Provides a synchronized watching experience using the Kaltura iframe URL
 */
async function handleWatchTogether(interaction: ButtonInteraction, videoId: string): Promise<void> {
  try {
    // Defer reply to give us time to process
    await interaction.deferReply({ ephemeral: false });
    
    // Check if the user is in a voice channel
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
      await interaction.editReply({
        content: 'You need to be in a voice channel to use Watch Together!'
      });
      return;
    }
    
    // Get the voice channel
    const voiceChannel = interaction.member.voice.channel;
    
    // Get the video details
    const video = await kalturaClient.getVideo(videoId);
    
    // Extract partner ID from the video play URL
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    
    // Get the uiConfID from environment variable
    const uiconfId = getEnv('KALTURA_PLAYER_ID', '46022343');
    
    // Create the Kaltura iframe URL which serves as an SPA
    const iframeUrl = `https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}?iframeembed=true&entry_id=${video.id}`;
    
    // Create a URL to our custom HTML page with the necessary parameters
    const watchTogetherUrl = new URL(`${process.env.PUBLIC_URL || 'http://localhost:3000'}/public/watch-together.html`);
    watchTogetherUrl.searchParams.append('partnerId', partnerId);
    watchTogetherUrl.searchParams.append('uiconfId', uiconfId);
    watchTogetherUrl.searchParams.append('entryId', video.id);
    watchTogetherUrl.searchParams.append('title', encodeURIComponent(video.title));
    
    try {
      // Instead of using Discord's built-in Watch Together (which only works with YouTube),
      // we'll create a custom approach that opens the Kaltura iframe URL directly
      
      // Use our custom HTML page for synchronized watching
      await interaction.editReply({
        content: `${interaction.user} started a Watch Together session for **${video.title}**!\n\nJoin voice channel "${voiceChannel.name}" and click the button below to watch together.`,
        embeds: [{
          title: `Watch Together: ${video.title}`,
          description: "Everyone should join the voice channel and click the button below at the same time. Use voice chat to coordinate playback.",
          color: 0x00B171, // Kaltura green
          image: {
            url: video.thumbnailUrl
          },
          footer: {
            text: `Kaltura Video • ID: ${video.id}`
          }
        }],
        components: [{
          type: 1, // Action Row
          components: [{
            type: 2, // Button
            style: 5, // Link
            label: '🎬 Open Synchronized Player',
            url: watchTogetherUrl.toString()
          }]
        }]
      });
      
      logger.info('Set up synchronized watching', {
        user: interaction.user.tag,
        videoId,
        voiceChannel: voiceChannel.name
      });
    } catch (error) {
      logger.error('Failed to set up synchronized watching', { error, videoId });
      
      // Provide a fallback option
      await interaction.editReply({
        content: `Failed to set up synchronized watching. You can still watch the video using the direct link below.`,
        components: [{
          type: 1, // Action Row
          components: [{
            type: 2, // Button
            style: 5, // Link
            label: '▶️ Open Video',
            url: watchTogetherUrl.toString()
          }]
        }]
      });
    }
  } catch (error) {
    logger.error('Error handling Watch Together button', { error, videoId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to set up synchronized watching. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to set up synchronized watching. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}