import fs from 'fs/promises';
import path from 'path';
import { logger } from '../common/logger';

/**
 * Server configuration interface that defines the structure of the configuration
 * for each Discord server.
 */
export interface ServerConfig {
  notifications: {
    enabled: boolean;
    types: {
      [key: string]: boolean;  // e.g., "media_upload": true
    };
    templates: {
      [key: string]: string;   // e.g., "meeting_start": "A new meeting has started: {{title}}"
    };
    channels: {
      default: string;         // Default channel ID or name
      [key: string]: string;   // Event-specific channels
    };
  };
  commands: {
    enabled: boolean;
    prefix: string;            // Optional command prefix for this server
    permissions: {
      [command: string]: string[]; // Command-specific role requirements
    };
  };
  roles: {
    mapping: {
      [discordRole: string]: string;  // e.g., "admin": "moderator"
    };
  };
  features: {
    [feature: string]: boolean | string; // Feature flags and configuration values
  };
  kaltura?: {
    session?: {
      privileges?: {
        default?: string;
        video?: string;
        meeting?: string;
        [key: string]: string | undefined;
      };
    };
    video?: {
      embedBaseUrl?: string;
    };
  };
}

/**
 * Configuration Service responsible for loading, merging, and caching configurations.
 * Provides server-specific configurations with defaults.
 */
export class ConfigService {
  private defaultConfig!: ServerConfig; // Initialized in the initialize method
  private configCache: Map<string, { config: ServerConfig, expiry: number }> = new Map();
  private cacheTTL: number = 300000; // 5 minutes in milliseconds
  private configDir: string;
  
  /**
   * Creates a new ConfigService instance.
   * @param configDir - Directory where configuration files are stored
   */
  constructor(configDir: string = path.join(process.cwd(), 'config')) {
    this.configDir = configDir;
  }
  
  /**
   * Initializes the configuration service by loading the default configuration.
   * Should be called before using any other methods.
   */
  async initialize(): Promise<void> {
    try {
      // Load default configuration
      const defaultConfigPath = path.join(this.configDir, 'default_config.json');
      const defaultConfigData = await fs.readFile(defaultConfigPath, 'utf-8');
      this.defaultConfig = JSON.parse(defaultConfigData);
      
      logger.info('Default configuration loaded successfully');
    } catch (error) {
      logger.error('Failed to load default configuration', { error });
      throw new Error('Failed to initialize configuration service');
    }
  }
  
  /**
   * Gets the configuration for a specific Discord server.
   * Merges server-specific overrides with the default configuration.
   * @param serverId - Discord server ID
   * @returns Merged server configuration
   */
  async getServerConfig(serverId: string): Promise<ServerConfig> {
    // Check cache first
    const cached = this.configCache.get(serverId);
    if (cached && cached.expiry > Date.now()) {
      return cached.config;
    }
    
    try {
      // Try to load server-specific configuration
      const serverConfigPath = path.join(this.configDir, 'overrides', `${serverId}.json`);
      let serverConfig: Partial<ServerConfig> = {};
      
      try {
        const serverConfigData = await fs.readFile(serverConfigPath, 'utf-8');
        serverConfig = JSON.parse(serverConfigData);
      } catch (error) {
        // If file doesn't exist, use empty object (will be merged with default)
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          logger.error('Error reading server configuration', { error, serverId });
        }
      }
      
      // Merge with default configuration
      const mergedConfig = this.mergeConfigs(this.defaultConfig, serverConfig);
      
      // Cache the result
      this.configCache.set(serverId, {
        config: mergedConfig,
        expiry: Date.now() + this.cacheTTL
      });
      
      return mergedConfig;
    } catch (error) {
      logger.error('Failed to get server configuration', { error, serverId });
      return this.defaultConfig;
    }
  }
  
  /**
   * Deep merges server-specific configuration with default configuration.
   * @param defaultConfig - Default configuration
   * @param serverConfig - Server-specific configuration
   * @returns Merged configuration
   */
  private mergeConfigs(defaultConfig: ServerConfig, serverConfig: Partial<ServerConfig>): ServerConfig {
    // Create a deep copy of the default config
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    // Replace placeholders with environment variables
    this.replaceEnvPlaceholders(merged);
    
    // Merge notifications
    if (serverConfig.notifications) {
      if (serverConfig.notifications.enabled !== undefined) {
        merged.notifications.enabled = serverConfig.notifications.enabled;
      }
      
      // Merge notification types
      if (serverConfig.notifications.types) {
        merged.notifications.types = {
          ...merged.notifications.types,
          ...serverConfig.notifications.types
        };
      }
      
      // Merge notification templates
      if (serverConfig.notifications.templates) {
        merged.notifications.templates = {
          ...merged.notifications.templates,
          ...serverConfig.notifications.templates
        };
      }
      
      // Merge notification channels
      if (serverConfig.notifications.channels) {
        merged.notifications.channels = {
          ...merged.notifications.channels,
          ...serverConfig.notifications.channels
        };
      }
    }
    
    // Merge commands
    if (serverConfig.commands) {
      if (serverConfig.commands.enabled !== undefined) {
        merged.commands.enabled = serverConfig.commands.enabled;
      }
      
      if (serverConfig.commands.prefix !== undefined) {
        merged.commands.prefix = serverConfig.commands.prefix;
      }
      
      // Merge command permissions
      if (serverConfig.commands.permissions) {
        merged.commands.permissions = {
          ...merged.commands.permissions,
          ...serverConfig.commands.permissions
        };
      }
    }
    
    // Merge roles
    if (serverConfig.roles) {
      // Merge role mappings
      if (serverConfig.roles.mapping) {
        merged.roles.mapping = {
          ...merged.roles.mapping,
          ...serverConfig.roles.mapping
        };
      }
    }
    
    // Merge features
    if (serverConfig.features) {
      merged.features = {
        ...merged.features,
        ...serverConfig.features
      };
    }
    
    // Merge Kaltura settings
    if (serverConfig.kaltura) {
      if (!merged.kaltura) {
        merged.kaltura = {};
      }
      
      // Merge session settings
      if (serverConfig.kaltura.session) {
        if (!merged.kaltura.session) {
          merged.kaltura.session = {};
        }
        
        // Merge session privileges
        if (serverConfig.kaltura.session.privileges) {
          if (!merged.kaltura.session.privileges) {
            merged.kaltura.session.privileges = {};
          }
          
          merged.kaltura.session.privileges = {
            ...merged.kaltura.session.privileges,
            ...serverConfig.kaltura.session.privileges
          };
        }
      }
      
      // Merge video settings
      if (serverConfig.kaltura.video) {
        if (!merged.kaltura.video) {
          merged.kaltura.video = {};
        }
        
        // Merge video settings
        merged.kaltura.video = {
          ...merged.kaltura.video,
          ...serverConfig.kaltura.video
        };
      }
    }
    
    return merged;
  }
  
  /**
   * Saves server-specific configuration overrides.
   * @param serverId - Discord server ID
   * @param config - Configuration to save
   */
  async saveServerConfig(serverId: string, config: Partial<ServerConfig>): Promise<void> {
    try {
      // Ensure overrides directory exists
      const overridesDir = path.join(this.configDir, 'overrides');
      await fs.mkdir(overridesDir, { recursive: true });
      
      // Get current server-specific overrides
      let currentOverrides: Partial<ServerConfig> = {};
      const serverConfigPath = path.join(overridesDir, `${serverId}.json`);
      
      try {
        const currentData = await fs.readFile(serverConfigPath, 'utf-8');
        currentOverrides = JSON.parse(currentData);
      } catch (error) {
        // If file doesn't exist, start with empty object
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          logger.error('Error reading existing server configuration', { error, serverId });
        }
      }
      
      // Merge with provided config (only store the overrides, not the full config)
      const newOverrides = this.deepMerge(currentOverrides, config);
      
      // Save to file
      await fs.writeFile(serverConfigPath, JSON.stringify(newOverrides, null, 2), 'utf-8');
      
      // Invalidate cache
      this.configCache.delete(serverId);
      
      logger.info('Server configuration saved successfully', { serverId });
    } catch (error) {
      logger.error('Failed to save server configuration', { error, serverId });
      throw new Error('Failed to save server configuration');
    }
  }
  
  /**
   * Deep merges two objects.
   * @param target - Target object
   * @param source - Source object
   * @returns Merged object
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  /**
   * Resets the configuration for a specific server to default values.
   * @param serverId - Discord server ID
   * @param section - Optional section to reset (e.g., 'notifications', 'commands')
   */
  async resetServerConfig(serverId: string, section?: string): Promise<void> {
    try {
      const serverConfigPath = path.join(this.configDir, 'overrides', `${serverId}.json`);
      
      // If no section specified, delete the entire file
      if (!section) {
        try {
          await fs.unlink(serverConfigPath);
          logger.info('Server configuration reset to default', { serverId });
        } catch (error) {
          // If file doesn't exist, that's fine
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      } else {
        // Reset only the specified section
        try {
          const currentData = await fs.readFile(serverConfigPath, 'utf-8');
          const currentOverrides = JSON.parse(currentData);
          
          // Remove the specified section
          if (currentOverrides[section]) {
            delete currentOverrides[section];
            
            // If there are still overrides, save the file
            if (Object.keys(currentOverrides).length > 0) {
              await fs.writeFile(serverConfigPath, JSON.stringify(currentOverrides, null, 2), 'utf-8');
            } else {
              // If no overrides left, delete the file
              await fs.unlink(serverConfigPath);
            }
          }
          
          logger.info(`Server configuration section '${section}' reset to default`, { serverId });
        } catch (error) {
          // If file doesn't exist, that's fine
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }
      
      // Invalidate cache
      this.configCache.delete(serverId);
    } catch (error) {
      logger.error('Failed to reset server configuration', { error, serverId });
      throw new Error('Failed to reset server configuration');
    }
  }
  
  /**
   * Replace placeholders in the configuration with environment variables.
   * Placeholders are in the format {{ENV_VAR_NAME}}.
   * @param obj - Object to process
   */
  private replaceEnvPlaceholders(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Extract environment variable name
        const envVarName = value.substring(2, value.length - 2);
        // Replace with environment variable value or keep original if not found
        const envValue = process.env[envVarName];
        if (envValue !== undefined) {
          obj[key] = envValue;
          logger.debug(`Replaced placeholder ${value} with environment variable`, { key, envVarName });
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        this.replaceEnvPlaceholders(value);
      }
    });
  }
  
  /**
   * Sets the cache TTL (Time To Live).
   * @param ttl - TTL in milliseconds
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
  
  /**
   * Clears the configuration cache.
   */
  clearCache(): void {
    this.configCache.clear();
    logger.info('Configuration cache cleared');
  }
}

/**
 * Helper function to check if a value is an object.
 * @param item - Value to check
 * @returns True if the value is an object
 */
function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

// Export a singleton instance
export const configService = new ConfigService();