# Kaltura-Discord Integration Implementation Plan

This document outlines the implementation plan for the immediate action items identified in the update plan.

## 1. Testing End-to-End Flow

### Objectives
- Validate Discord bot commands with a live Discord server
- Ensure robust integration with Kaltura APIs using mock and real data
- Verify proper handling of authentication, session management, and JWT token generation

### Implementation Steps

#### 1.1 Set Up Test Environment
- Create a dedicated test Discord server
- Configure bot permissions and invite to test server
- Set up test users with different roles
- Configure test Kaltura environment or mock responses

#### 1.2 Create Test Cases
- **Command Registration**
  - Verify all commands are registered with Discord
  - Check command options and descriptions
- **User Authentication**
  - Test token generation and validation
  - Verify role mapping from Discord to Kaltura
- **Meeting Management**
  - Test meeting creation with different types
  - Test joining existing meetings
  - Test listing active meetings
  - Test ending meetings
- **Error Handling**
  - Test invalid inputs and parameters
  - Test expired tokens and sessions
  - Test unavailable Kaltura services

#### 1.3 Execute Tests
- Run manual tests for each command
- Document results and issues
- Fix identified issues
- Retest after fixes

#### 1.4 Automate Tests
- Create automated tests for critical paths
- Set up CI/CD pipeline for automated testing
- Implement integration tests for service interactions

## 2. Server-Specific Customization

### Objectives
- Implement a default configuration with optional server-specific overrides
- Create a configuration service for loading and merging configurations
- Limit customization to notification types and Discord message templates

### Implementation Steps

#### 2.1 Create Configuration Structure
- Create `config` directory structure
- Create `default_config.json` with default settings
- Create `overrides` directory for server-specific configurations

#### 2.2 Implement Configuration Service
- Create `src/services/configService.ts`
- Implement configuration loading and merging
- Add caching with TTL to avoid frequent filesystem reads
- Implement configuration validation

```typescript
// src/services/configService.ts
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../common/logger';

export interface ServerConfig {
  notifications: {
    enabled: boolean;
    types: {
      [key: string]: boolean;
    };
    templates: {
      [key: string]: string;
    };
  };
  commands: {
    enabled: boolean;
    prefix: string;
  };
  roles: {
    mapping: {
      [discordRole: string]: string;
    };
  };
}

export class ConfigService {
  private defaultConfig: ServerConfig;
  private serverConfigs: Map<string, ServerConfig> = new Map();
  private configCache: Map<string, { config: ServerConfig, expiry: number }> = new Map();
  private cacheTTL: number = 300000; // 5 minutes in milliseconds
  private configDir: string;
  
  constructor(configDir: string = path.join(process.cwd(), 'config')) {
    this.configDir = configDir;
  }
  
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
  
  private mergeConfigs(defaultConfig: ServerConfig, serverConfig: Partial<ServerConfig>): ServerConfig {
    // Deep merge the configurations
    const merged = { ...defaultConfig };
    
    // Merge notifications
    if (serverConfig.notifications) {
      merged.notifications = {
        ...merged.notifications,
        ...serverConfig.notifications,
        types: {
          ...merged.notifications.types,
          ...serverConfig.notifications.types
        },
        templates: {
          ...merged.notifications.templates,
          ...serverConfig.notifications.templates
        }
      };
    }
    
    // Merge commands
    if (serverConfig.commands) {
      merged.commands = {
        ...merged.commands,
        ...serverConfig.commands
      };
    }
    
    // Merge roles
    if (serverConfig.roles) {
      merged.roles = {
        ...merged.roles,
        mapping: {
          ...merged.roles.mapping,
          ...serverConfig.roles.mapping
        }
      };
    }
    
    return merged;
  }
  
  async saveServerConfig(serverId: string, config: Partial<ServerConfig>): Promise<void> {
    try {
      // Get current config
      const currentConfig = await this.getServerConfig(serverId);
      
      // Merge with provided config
      const mergedConfig = this.mergeConfigs(currentConfig, config);
      
      // Ensure overrides directory exists
      const overridesDir = path.join(this.configDir, 'overrides');
      await fs.mkdir(overridesDir, { recursive: true });
      
      // Save to file
      const serverConfigPath = path.join(overridesDir, `${serverId}.json`);
      await fs.writeFile(serverConfigPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
      
      // Update cache
      this.configCache.set(serverId, {
        config: mergedConfig,
        expiry: Date.now() + this.cacheTTL
      });
      
      logger.info('Server configuration saved successfully', { serverId });
    } catch (error) {
      logger.error('Failed to save server configuration', { error, serverId });
      throw new Error('Failed to save server configuration');
    }
  }
}

// Export a singleton instance
export const configService = new ConfigService();
```

#### 2.3 Integrate Configuration Service
- Update `src/index.ts` to initialize configuration service
- Update `src/discord/commandHandlers.ts` to use server-specific configurations
- Update `src/services/userAuthService.ts` to use configurable role mappings

#### 2.4 Create Configuration Commands
- Add Discord commands for server administrators to configure settings
- Implement permission checks for configuration commands
- Create help documentation for configuration options

## 3. Versioning and Compatibility

### Objectives
- Adopt semantic versioning for Discord bot commands and API integrations
- Implement URL-based versioning for the API Gateway
- Create documentation for versioning and compatibility

### Implementation Steps

#### 3.1 API Versioning
- Update API Gateway to support versioned routes
- Implement version router in `src/services/apiGateway.ts`
- Create version compatibility layer

```typescript
// In apiGateway.ts
// Version router
app.use('/api/v1/meetings', createMeetingRoutesV1());
// Future versions
// app.use('/api/v2/meetings', createMeetingRoutesV2());

// Include version in API responses
res.status(200).json({
  version: '1.0.0',
  data: {
    // Response data
  }
});
```

#### 3.2 Command Versioning
- Add version metadata to command definitions in `src/discord/commands.ts`
- Implement command versioning in the Discord bot
- Create command compatibility layer

```typescript
// In commands.ts
interface CommandVersion {
  major: number;
  minor: number;
  patch: number;
  deprecated?: boolean;
  deprecatedMessage?: string;
}

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: any) => Promise<void>;
  version: CommandVersion;
}

// Example command with version
const startCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('kaltura-start')
    .setDescription('Start a new Kaltura meeting')
    // ... options
  execute: handleStartCommand,
  version: {
    major: 1,
    minor: 0,
    patch: 0
  }
};
```

#### 3.3 Version Documentation
- Create CHANGELOG.md file
- Document breaking changes and migration paths
- Include version compatibility information in API responses and command help

## 4. Documentation & Instructions

### Objectives
- Complete thorough documentation for the integration
- Create setup instructions for Discord bot and Kaltura integration
- Document configuration options and override examples

### Implementation Steps

#### 4.1 Create Documentation Structure
- Create documentation directory structure
- Define documentation format and style guide
- Set up documentation generation tools

#### 4.2 Write Setup Instructions
- Installation prerequisites and dependencies
- Discord bot setup and configuration
- Kaltura API integration setup
- Environment variables and configuration

#### 4.3 Document API Endpoints
- API reference documentation
- Authentication requirements
- Request and response formats
- Error codes and handling

#### 4.4 Create Usage Guidelines
- Available commands and their parameters
- Role mapping and permissions
- Notification configuration
- Troubleshooting common issues

#### 4.5 Document Configuration Options
- Default configuration options
- Server-specific override examples
- Configuration file format and schema
- Configuration commands and permissions

## 5. Implementation Timeline

| Task | Estimated Duration | Dependencies |
|------|-------------------|--------------|
| Set up test environment | 1 day | None |
| Create test cases | 2 days | Test environment |
| Execute tests | 3 days | Test cases |
| Create configuration structure | 1 day | None |
| Implement configuration service | 3 days | Configuration structure |
| Integrate configuration service | 2 days | Configuration service |
| Create configuration commands | 2 days | Configuration service integration |
| Implement API versioning | 2 days | None |
| Implement command versioning | 2 days | None |
| Create version documentation | 1 day | API and command versioning |
| Create documentation structure | 1 day | None |
| Write setup instructions | 2 days | None |
| Document API endpoints | 2 days | API versioning |
| Create usage guidelines | 2 days | None |
| Document configuration options | 1 day | Configuration service |

## 6. Success Criteria

- All Discord bot commands work correctly with a live Discord server
- Authentication, session management, and JWT token generation function properly
- Server-specific configuration overrides work as expected
- API versioning is implemented and documented
- Command versioning is implemented and documented
- Documentation is complete and accurate