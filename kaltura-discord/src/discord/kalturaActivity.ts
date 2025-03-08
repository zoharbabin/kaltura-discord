import { ApplicationCommandType, ButtonInteraction, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { logger } from '../common/logger';
import { kalturaClient } from '../services/kalturaClient';
import { configService } from '../services/configService';
import { getEnv } from '../common/envService';

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Check if Discord Activities API is available for a server
 * @param serverId The Discord server ID
 * @returns True if Activities API is available, false otherwise
 */
async function checkActivitiesApiAccess(serverId: string): Promise<boolean> {
  try {
    // Get server-specific configuration
    const config = await configService.getServerConfig(serverId);
    
    // Check if Activities API is enabled in configuration
    return config.features?.activitiesApi === true;
  } catch (error) {
    logger.error('Error checking Activities API access', { error, serverId });
    return false;
  }
}

/**
 * Share a Kaltura video to a Discord channel with rich embed and watch options.
 * This updated version uses the Kaltura iframe URL (an SPA) as the destination.
 * @param interaction The interaction that triggered this action
 * @param videoId The Kaltura video ID to share
 */
export async function launchKalturaVideoActivity(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  videoId: string
): Promise<void> {
  try {
    // Defer reply to give us time to process
    await interaction.deferReply({ ephemeral: false }); // Non-ephemeral so everyone can see

    // Get the video details
    const video = await kalturaClient.getVideo(videoId);

    // Get server ID for server-specific configuration
    const serverId = interaction.guildId || 'default';

    // Get server-specific configuration
    const config = await configService.getServerConfig(serverId);

    // Extract partner ID from the video play URL
    const partnerIdMatch = video.playUrl.match(/\/p\/(\d+)\//);
    const partnerId = partnerIdMatch ? partnerIdMatch[1] : '';
    
    // Get the uiConfID from environment variable
    const uiconfId = getEnv('KALTURA_PLAYER_ID', '46022343');

    // (Optional) Direct play URL from your configuration – might be used elsewhere
    const embedBaseUrl = config.kaltura?.video?.embedBaseUrl || 'https://hackerspacelive.events.kaltura.com/media/t/';
    const directPlayUrl = `${embedBaseUrl}${video.id}`;

    // Create the Kaltura iframe URL which serves as an SPA.
    const iframeUrl = `https://cdnapisec.kaltura.com/p/${partnerId}/embedPlaykitJs/uiconf_id/${uiconfId}?iframeembed=true&entry_id=${video.id}`;

    // Create a rich embed for the video. Update the URL to point to the iframeUrl.
    const videoEmbed = {
      title: video.title,
      description: video.description || 'No description provided',
      color: 0x00B171, // Kaltura green
      fields: [
        {
          name: 'Video Info',
          value: `⏱️ \`${formatDuration(video.duration)}\` • 👁️ ${video.views} views • 📅 ${new Date(video.createdAt).toLocaleDateString()}`,
          inline: false
        }
      ],
      image: {
        url: video.thumbnailUrl
      },
      footer: {
        text: `Kaltura Video • ID: ${video.id}`
      },
      url: iframeUrl // Make the title clickable to open the Kaltura SPA
    };

    // Check if the user is in a voice channel (for Watch Together feature)
    const isInVoiceChannel = interaction.member instanceof GuildMember &&
      interaction.member.voice.channel !== null;

    // Create action buttons for the video
    const actionRowComponents = [
      {
        type: 2, // Button
        style: 5, // Link style
        label: '▶️ Watch Video',
        url: iframeUrl // Direct users to the Kaltura SPA
      },
      {
        type: 2, // Button
        style: 1, // Primary style
        label: '📺 Get Video Link & Embed Code',
        custom_id: `inline_activity_${video.id}`
      }
    ];

    // Add Watch Together button if user is in a voice channel
    if (isInVoiceChannel) {
      // Check if Discord Activities API is available for this server
      const hasActivitiesAccess = await checkActivitiesApiAccess(serverId);
      
      if (hasActivitiesAccess) {
        // Use Discord's Activities API for Watch Together
        actionRowComponents.push({
          type: 2, // Button
          style: 3, // Success style (green)
          label: '👥 Watch Together (Discord Activity)',
          custom_id: `discord_activity_${video.id}`
        });
      } else {
        // Fall back to our custom implementation
        actionRowComponents.push({
          type: 2, // Button
          style: 3, // Success style (green)
          label: '👥 Watch Together',
          custom_id: `watch_together_${video.id}`
        });
      }
    }

    const actionRow = {
      type: 1, // Action Row
      components: actionRowComponents
    };

    await interaction.editReply({
      content: `${interaction.user} shared a Kaltura video: **${video.title}**\n\nClick the buttons below to watch the video.`,
      embeds: [videoEmbed],
      components: [actionRow]
    });

    logger.info('Shared Kaltura video in Discord channel', {
      user: interaction.user.tag,
      videoId: video.id,
      channel: interaction.channelId
    });
  } catch (error) {
    logger.error('Error sharing Kaltura video to channel', { error, videoId });

    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to share video to channel. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to share video to channel. Please try again later.',
        ephemeral: true
      });
    }
  }
}

/**
 * Generate a direct embed URL for a Kaltura video
 * @param videoId The Kaltura video ID
 * @param serverId The Discord server ID for server-specific configuration
 * @returns The direct embed URL for the video
 */
export async function generateVideoEmbedUrl(videoId: string, serverId: string = 'default'): Promise<string> {
  // Get server-specific configuration
  const config = await configService.getServerConfig(serverId);
  
  // Get the embed base URL from configuration or use default
  const embedBaseUrl = config.kaltura?.video?.embedBaseUrl || 'https://hackerspacelive.events.kaltura.com/media/t/';

  // Create the embed URL for the video
  return `${embedBaseUrl}${videoId}`;
}

/**
 * Launch a Discord Activity for watching a Kaltura video together
 * @param interaction The interaction that triggered this action
 * @param videoId The Kaltura video ID to watch
 */
export async function launchDiscordActivity(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  videoId: string
): Promise<void> {
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
    
    logger.debug('Using Discord Activity URL', { activityBaseUrl, env: process.env.NODE_ENV });
    
    // Create the Discord Activity URL
    const activityUrl = `${activityBaseUrl}/${applicationId}?metadata=${encodeURIComponent(JSON.stringify(metadata))}`;
    
    logger.debug('Launching Discord Activity', {
      activityBaseUrl,
      applicationId,
      metadata: JSON.stringify(metadata)
    });
    
    // Launch the Discord Activity directly in the voice channel
    // First, check if the user is in a voice channel
    if (!voiceChannel) {
      await interaction.editReply({
        content: 'You need to be in a voice channel to use Watch Together!'
      });
      return;
    }

    try {
      // Create a message with instructions while we attempt to launch the activity
      await interaction.editReply({
        content: `${interaction.user} is starting a Watch Together activity for **${video.title}**!\n\nJoin voice channel "${voiceChannel.name}" to watch together.`,
        embeds: [{
          title: `Watch Together: ${video.title}`,
          description: "The activity is being launched in your voice channel. Everyone in the channel will be able to watch together.",
          color: 0x00B171, // Kaltura green
          image: {
            url: video.thumbnailUrl
          },
          footer: {
            text: `Kaltura Video • ID: ${video.id}`
          }
        }]
      });

      // Use Discord's built-in activity launching mechanism
      // For Discord Activities, we need to provide a button that links to the activity
      // Discord will handle launching the activity in the client when clicked
      await interaction.followUp({
        content: `Click the button below to join the Watch Together activity in voice channel "${voiceChannel.name}"`,
        components: [{
          type: 1, // Action Row
          components: [{
            type: 2, // Button
            style: 5, // Link button
            label: '🎬 Join Watch Together Activity',
            // Use the standard HTTPS URL for the activity
            url: activityUrl
          }]
        }]
      });
    } catch (activityError) {
      logger.error('Error launching Discord Activity directly', { activityError, videoId });
      
      // Fallback to the standard URL
      await interaction.followUp({
        content: 'Unable to launch the activity directly. Please use this link:',
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
    
    logger.info('Launched Discord Activity for video', {
      user: interaction.user.tag,
      videoId,
      voiceChannel: voiceChannel.name
    });
  } catch (error) {
    logger.error('Error launching Discord Activity', { error, videoId });
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Failed to launch Discord Activity. Please try again later.'
      });
    } else {
      await interaction.reply({
        content: 'Failed to launch Discord Activity. Please try again later.',
        ephemeral: true
      });
    }
  }
}