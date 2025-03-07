# Kaltura-Discord Integration Architecture Update

This document outlines the architectural decisions and implementation plan for the Kaltura-Discord integration based on the update plan.

## 1. Server-Specific Customization Architecture

The proposed configuration structure with default settings and server-specific overrides is a solid approach. Here's how to implement it:

### Configuration System Architecture

```
config/
├── default_config.json     # Default configuration for all servers
└── overrides/              # Server-specific overrides
    └── [server_id].json    # One file per Discord server
```

### Implementation Recommendations:

1. **Configuration Service**:
   - Create a new service `src/services/configService.ts` to manage configuration loading and merging
   - Implement deep merging of default config with server-specific overrides
   - Add caching with TTL to avoid frequent filesystem reads

2. **Configuration Schema**:
   ```typescript
   interface ServerConfig {
     notifications: {
       enabled: boolean;
       types: {
         [key: string]: boolean;  // e.g., "media_upload": true
       };
       templates: {
         [key: string]: string;   // e.g., "meeting_start": "A new meeting has started: {{title}}"
       };
     };
     commands: {
       enabled: boolean;
       prefix: string;            // Optional command prefix for this server
     };
     roles: {
       mapping: {
         [discordRole: string]: string;  // e.g., "admin": "moderator"
       };
     };
   }
   ```

3. **Default Configuration**:
   ```json
   {
     "notifications": {
       "enabled": true,
       "types": {
         "meeting_start": true,
         "meeting_end": true,
         "user_join": false,
         "recording_ready": true
       },
       "templates": {
         "meeting_start": "A new {{type}} has started: **{{title}}**",
         "meeting_end": "The {{type}} **{{title}}** has ended",
         "user_join": "{{username}} has joined the {{type}} **{{title}}**",
         "recording_ready": "Recording for **{{title}}** is now available"
       }
     },
     "commands": {
       "enabled": true,
       "prefix": ""
     },
     "roles": {
       "mapping": {
         "admin": "admin",
         "moderator": "moderator",
         "default": "viewer"
       }
     }
   }
   ```

## 2. Versioning and Compatibility Strategy

### API Versioning Architecture:

1. **API Versioning**:
   - Implement URL-based versioning for the API Gateway: `/api/v1/meetings`
   - Update the API Gateway to support multiple versions simultaneously
   - Create a version mapping service to handle backward compatibility

2. **Command Versioning**:
   - Add version metadata to command definitions
   - Implement command versioning in the Discord bot
   - Create a command compatibility layer for handling deprecated commands

### Implementation Recommendations:

1. **API Version Router**:
   ```typescript
   // In apiGateway.ts
   app.use('/api/v1/meetings', createMeetingRoutesV1());
   // Future versions
   // app.use('/api/v2/meetings', createMeetingRoutesV2());
   ```

2. **Command Version Metadata**:
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
   ```

3. **Version Documentation**:
   - Create a CHANGELOG.md file to track changes
   - Document breaking changes and migration paths
   - Include version compatibility information in API responses

## 3. Notification System Architecture

To address the open question about notification storage:

### Notification System Architecture:

1. **Storage Options**:
   - **File-based Storage**: Simple JSON files for small-scale deployments
   - **MongoDB**: For scalable, flexible schema storage (recommended)
   - **Redis**: For high-performance, ephemeral notification preferences

2. **Notification Service**:
   - Create a new service `src/services/notificationService.ts`
   - Implement webhook handling for Kaltura events
   - Use the configuration service to determine notification preferences
   - Implement message templating with variable substitution

3. **Implementation Recommendation**:
   ```typescript
   // src/services/notificationService.ts
   export class NotificationService {
     private configService: ConfigService;
     private db: MongoDB; // or other storage mechanism
     
     async handleEvent(event: KalturaEvent): Promise<void> {
       // Get servers that should receive this notification
       const servers = await this.getInterestedServers(event.type);
       
       for (const server of servers) {
         const serverConfig = await this.configService.getServerConfig(server.id);
         
         // Check if this notification type is enabled
         if (!serverConfig.notifications.enabled || 
             !serverConfig.notifications.types[event.type]) {
           continue;
         }
         
         // Get the template and format the message
         const template = serverConfig.notifications.templates[event.type];
         const message = this.formatMessage(template, event);
         
         // Send to Discord
         await this.sendDiscordNotification(server.id, message);
       }
     }
     
     // Other methods...
   }
   ```

## 4. Role Mapping Architecture

To address the open question about role mapping:

### Role Mapping Architecture:

1. **Enhanced Role Mapping**:
   - Move from the current simple role mapping to a configurable approach
   - Allow server administrators to define custom role mappings
   - Store mappings in the server configuration

2. **Implementation Recommendation**:
   ```typescript
   // Update userAuthService.ts
   mapDiscordUserToKaltura(discordUser: DiscordUser, serverId?: string): MappedUser {
     // Generate a Kaltura user ID based on Discord ID
     const kalturaUserId = `discord_${discordUser.id}`;
     
     // Get server-specific role mappings if available
     let roleMappings = { 'default': 'viewer' };
     if (serverId) {
       const serverConfig = this.configService.getServerConfig(serverId);
       roleMappings = serverConfig.roles.mapping;
     }
     
     // Determine Kaltura role based on Discord roles
     let kalturaRole: 'viewer' | 'moderator' | 'admin' = 'viewer';
     
     if (discordUser.roles) {
       // Find the highest priority role that has a mapping
       for (const role of discordUser.roles) {
         const mappedRole = roleMappings[role.toLowerCase()] || roleMappings['default'];
         
         // Apply the highest privilege role
         if (mappedRole === 'admin' || 
            (mappedRole === 'moderator' && kalturaRole === 'viewer')) {
           kalturaRole = mappedRole as 'viewer' | 'moderator' | 'admin';
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
   ```

## 5. Testing End-to-End Flow

To address the immediate action item of testing the end-to-end flow:

### Testing Strategy:

1. **Unit Tests**:
   - Test individual components in isolation
   - Mock external dependencies (Discord API, Kaltura API)
   - Focus on edge cases and error handling

2. **Integration Tests**:
   - Test the interaction between components
   - Use test doubles for external services
   - Verify data flow between services

3. **End-to-End Tests**:
   - Test the complete flow from Discord command to Kaltura meeting
   - Verify authentication, session management, and JWT token generation
   - Test with both mock and real data

4. **Test Environment**:
   - Set up a dedicated test Discord server
   - Create test users with different roles
   - Configure test Kaltura environment

5. **Test Cases**:
   - Command registration and handling
   - User authentication and role mapping
   - Meeting creation, joining, and ending
   - Error handling and recovery

## 6. Documentation & Instructions

To address the immediate action item of completing documentation:

### Documentation Structure:

```
docs/
├── setup/
│   ├── installation.md
│   ├── discord-bot-setup.md
│   └── kaltura-integration.md
├── usage/
│   ├── commands.md
│   ├── notifications.md
│   └── role-mapping.md
├── configuration/
│   ├── server-specific.md
│   └── templates.md
├── development/
│   ├── architecture.md
│   ├── api-reference.md
│   └── versioning.md
└── operations/
    ├── monitoring.md
    └── troubleshooting.md
```

### Documentation Content:

1. **Setup Instructions**:
   - Prerequisites and dependencies
   - Installation steps
   - Configuration options
   - Environment variables

2. **Usage Guidelines**:
   - Available commands and their parameters
   - Role mapping and permissions
   - Notification configuration
   - Troubleshooting common issues

3. **API Documentation**:
   - Endpoints and their parameters
   - Authentication requirements
   - Response formats
   - Error codes and handling

## 7. Metrics and Monitoring

To address the metrics and monitoring section of the update plan:

### Metrics Implementation:

1. **User Engagement Metrics**:
   - Command usage frequency
   - Meeting participation rates
   - Feature adoption across servers

2. **Performance Metrics**:
   - API response times
   - Command processing times
   - Meeting creation and joining times

3. **Error Metrics**:
   - Authentication failures
   - API integration errors
   - Command execution failures

4. **Monitoring Implementation**:
   - Structured logging with Winston
   - Prometheus metrics collection
   - Grafana dashboards for visualization

## 8. Implementation Plan

Here's a step-by-step implementation plan for these architectural changes:

1. **Configuration System**:
   - Create the configuration service
   - Define the default configuration
   - Implement server-specific override loading

2. **Versioning**:
   - Add version metadata to commands and APIs
   - Implement the versioning router in the API Gateway
   - Create the CHANGELOG.md file

3. **Notification System**:
   - Implement the notification service
   - Set up webhook handling for Kaltura events
   - Create the message templating system

4. **Role Mapping**:
   - Enhance the user authentication service with configurable role mapping
   - Update the command handlers to use server-specific role mappings

5. **Testing**:
   - Create test cases for each component
   - Test the end-to-end flow with a live Discord server
   - Verify proper handling of authentication and tokens

6. **Documentation**:
   - Create the documentation structure
   - Write setup and usage instructions
   - Document API endpoints and configuration options

7. **Metrics and Monitoring**:
   - Implement metrics collection
   - Set up monitoring dashboards
   - Configure alerts for critical errors