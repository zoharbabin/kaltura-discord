import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { logger } from '../common/logger';
import { KalturaSession, kalturaClient } from './kalturaClient';
import { configService } from './configService';
import { getEnv } from '../common/envService';

/**
 * Interface for Discord user data
 */
export interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  roles?: string[];
}

/**
 * Interface for mapped user data
 */
export interface MappedUser {
  discordId: string;
  discordUsername: string;
  kalturaUserId: string;
  kalturaRole: 'viewer' | 'moderator' | 'admin';
}

/**
 * Interface for authentication token data
 */
export interface AuthToken {
  token: string;
  expiresAt: Date;
}

/**
 * User Authentication and Mapping Service
 * Handles user identity mapping between Discord and Kaltura
 */
export class UserAuthService {
  private jwtSecret: string;
  private jwtExpiry: string;

  /**
   * Create a new User Authentication Service
   */
  constructor() {
    this.jwtSecret = getEnv('JWT_SECRET', 'default_jwt_secret_for_development');
    this.jwtExpiry = getEnv('JWT_EXPIRY', '1h');
    
    if (this.jwtSecret === 'default_jwt_secret_for_development') {
      logger.warn('Using default JWT secret for development. This is not secure for production.');
    }
  }

  /**
   * Map a Discord user to a Kaltura user
   * @param discordUser Discord user data
   * @param serverId Optional Discord server ID for server-specific role mapping
   * @returns Mapped user data
   */
  async mapDiscordUserToKaltura(discordUser: DiscordUser, serverId?: string): Promise<MappedUser> {
    // Generate a Kaltura user ID based on Discord ID
    const kalturaUserId = `discord_${discordUser.id}`;
    
    // Default role
    let kalturaRole: 'viewer' | 'moderator' | 'admin' = 'viewer';
    
    if (discordUser.roles && discordUser.roles.length > 0) {
      try {
        // Get server configuration for role mapping if serverId is provided
        const config = serverId ?
          await configService.getServerConfig(serverId) :
          await configService.getServerConfig('default');
        
        // Check for role mappings in configuration
        for (const discordRole of discordUser.roles) {
          const mappedRole = config.roles.mapping[discordRole.toLowerCase()];
          if (mappedRole) {
            // If a role is mapped to admin or moderator, use it
            if (mappedRole === 'admin') {
              kalturaRole = 'admin';
              break;
            } else if (mappedRole === 'moderator') {
              kalturaRole = 'moderator';
              // Don't break here, continue checking for admin role
            }
          }
        }
        
        // If no specific mapping found, use default mapping logic
        if (kalturaRole === 'viewer') {
          // Check for admin roles using patterns
          const adminRolePatterns = ['admin', 'owner', 'moderator'];
          const hasAdminRole = discordUser.roles.some(role =>
            adminRolePatterns.some(pattern => role.toLowerCase().includes(pattern))
          );
          
          if (hasAdminRole) {
            kalturaRole = 'moderator';
          }
        }
      } catch (error) {
        logger.error('Error getting role mapping from configuration', { error });
        // Fall back to default mapping logic
        const adminRolePatterns = ['admin', 'owner', 'moderator'];
        const hasAdminRole = discordUser.roles.some(role =>
          adminRolePatterns.some(pattern => role.toLowerCase().includes(pattern))
        );
        
        if (hasAdminRole) {
          kalturaRole = 'moderator';
        }
      }
    }
    
    return {
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      kalturaUserId,
      kalturaRole,
    };
  }

  /**
   * Generate a Kaltura session for a mapped user
   * @param mappedUser Mapped user data
   * @returns Promise resolving to a Kaltura session
   */
  async generateKalturaSession(mappedUser: MappedUser): Promise<KalturaSession> {
    // Determine session type and privileges based on role
    const sessionType = mappedUser.kalturaRole === 'admin' ? 2 : 0;
    const privileges = mappedUser.kalturaRole === 'moderator' ? 'moderator' : '';
    
    // Generate the session
    return kalturaClient.generateSession(
      mappedUser.kalturaUserId,
      sessionType as 0 | 2,
      3600, // 1 hour
      privileges
    );
  }

  /**
   * Generate an authentication token for a mapped user
   * @param mappedUser Mapped user data
   * @returns Authentication token data
   */
  generateAuthToken(mappedUser: MappedUser): AuthToken {
    const payload = {
      discordId: mappedUser.discordId,
      discordUsername: mappedUser.discordUsername,
      kalturaUserId: mappedUser.kalturaUserId,
      kalturaRole: mappedUser.kalturaRole,
    };
    
    // Sign the token with expiry
    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry
    } as jwt.SignOptions);
    
    // Calculate expiry date
    const expiryInSeconds = this.parseExpiryString(this.jwtExpiry);
    const expiresAt = new Date(Date.now() + expiryInSeconds * 1000);
    
    return {
      token,
      expiresAt,
    };
  }

  /**
   * Verify and decode an authentication token
   * @param token Authentication token
   * @returns Mapped user data if token is valid, null otherwise
   */
  verifyAuthToken(token: string): MappedUser | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      return {
        discordId: decoded.discordId,
        discordUsername: decoded.discordUsername,
        kalturaUserId: decoded.kalturaUserId,
        kalturaRole: decoded.kalturaRole,
      };
    } catch (error) {
      logger.error('Failed to verify auth token', { error });
      return null;
    }
  }

  /**
   * Generate a meeting join URL for a user
   * @param meetingId Meeting ID
   * @param mappedUser Mapped user data
   * @returns Promise resolving to the join URL
   */
  async generateMeetingJoinUrl(meetingId: string, mappedUser: MappedUser): Promise<string> {
    // Determine role for the join URL
    const role = mappedUser.kalturaRole === 'viewer' ? 0 : 1;
    
    // Generate the join URL
    return kalturaClient.generateJoinUrl(
      meetingId,
      mappedUser.kalturaUserId,
      role as 0 | 1
    );
  }

  /**
   * Parse an expiry string (e.g., '1h', '30m') to seconds
   * @param expiry Expiry string
   * @returns Expiry in seconds
   */
  private parseExpiryString(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      // Default to 1 hour if format is invalid
      return 3600;
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}

// Export a singleton instance
export const userAuthService = new UserAuthService();