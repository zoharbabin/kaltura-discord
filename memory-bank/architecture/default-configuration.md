# Kaltura-Discord Integration Default Configuration

This document outlines the default configuration structure for the Kaltura-Discord integration, which serves as the base for server-specific customization.

## Configuration Structure

The configuration system consists of a default configuration file (`default_config.json`) and optional server-specific override files (`[server_id].json`).

```
config/
├── default_config.json     # Default configuration for all servers
└── overrides/              # Server-specific overrides
    └── [server_id].json    # One file per Discord server
```

## Default Configuration Schema

The default configuration follows this schema:

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
    [feature: string]: boolean; // Feature flags
  };
}
```

## Default Configuration Content

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
      "recording_ready": "Recording for **{{title}}** is now available",
      "meeting_share": "@here {{username}} is inviting you to join a {{type}}: **{{title}}**"
    },
    "channels": {
      "default": "general",
      "recording_ready": "recordings"
    }
  },
  "commands": {
    "enabled": true,
    "prefix": "",
    "permissions": {
      "kaltura-start": ["@everyone"],
      "kaltura-join": ["@everyone"],
      "kaltura-list": ["@everyone"],
      "kaltura-end": ["@everyone"]
    }
  },
  "roles": {
    "mapping": {
      "admin": "admin",
      "moderator": "moderator",
      "default": "viewer"
    }
  },
  "features": {
    "embedding": true,
    "recording": true,
    "user_sync": true
  }
}
```

## Server-Specific Override Example

```json
{
  "notifications": {
    "types": {
      "user_join": true
    },
    "templates": {
      "meeting_start": "New {{type}} by {{creator}}: **{{title}}**"
    },
    "channels": {
      "default": "kaltura-notifications"
    }
  },
  "roles": {
    "mapping": {
      "teacher": "moderator",
      "student": "viewer"
    }
  }
}
```

## Configuration Service

The Configuration Service is responsible for loading, merging, and caching configurations. It provides the following functionality:

1. **Loading Configurations**:
   - Load default configuration at startup
   - Load server-specific configurations on demand
   - Validate configuration against schema

2. **Merging Configurations**:
   - Deep merge server-specific overrides with default configuration
   - Handle nested objects and arrays appropriately
   - Preserve default values for missing properties

3. **Caching**:
   - Cache configurations in memory with TTL
   - Reload configurations when TTL expires
   - Force reload when configurations are updated

4. **Access Control**:
   - Restrict configuration updates to server administrators
   - Log all configuration changes
   - Validate configuration changes before applying

## Configuration Variables

The following variables are available for use in templates:

### Meeting Events

| Variable | Description | Example |
|----------|-------------|---------|
| `{{title}}` | Meeting title | "Team Standup" |
| `{{type}}` | Meeting type | "webinar", "meeting", "classroom" |
| `{{id}}` | Meeting ID | "12345" |
| `{{creator}}` | Meeting creator | "JohnDoe" |
| `{{duration}}` | Meeting duration | "60 minutes" |
| `{{start_time}}` | Meeting start time | "2025-03-07T14:30:00Z" |
| `{{end_time}}` | Meeting end time | "2025-03-07T15:30:00Z" |
| `{{url}}` | Meeting join URL | "https://example.com/join/12345" |

### User Events

| Variable | Description | Example |
|----------|-------------|---------|
| `{{username}}` | User's Discord username | "JohnDoe" |
| `{{user_id}}` | User's Discord ID | "123456789012345678" |
| `{{roles}}` | User's Discord roles | "admin, moderator" |
| `{{join_time}}` | Time user joined the meeting | "2025-03-07T14:35:00Z" |
| `{{leave_time}}` | Time user left the meeting | "2025-03-07T15:25:00Z" |

### Recording Events

| Variable | Description | Example |
|----------|-------------|---------|
| `{{title}}` | Recording title | "Team Standup - 2025-03-07" |
| `{{duration}}` | Recording duration | "55 minutes" |
| `{{url}}` | Recording URL | "https://example.com/recording/12345" |
| `{{size}}` | Recording size | "250 MB" |
| `{{format}}` | Recording format | "MP4" |

## Configuration Commands

The following Discord commands are available for managing server configurations:

1. **View Configuration**:
   ```
   /kaltura-config view [section]
   ```
   Shows the current configuration for the server. Optionally specify a section to view only that part.

2. **Update Notification Settings**:
   ```
   /kaltura-config notifications enable [type] [value:true|false]
   ```
   Enable or disable specific notification types.

3. **Update Notification Template**:
   ```
   /kaltura-config template [type] [template]
   ```
   Set a custom template for a specific notification type.

4. **Update Role Mapping**:
   ```
   /kaltura-config role [discord_role] [kaltura_role]
   ```
   Map a Discord role to a Kaltura role.

5. **Reset Configuration**:
   ```
   /kaltura-config reset [section]
   ```
   Reset the configuration to default values. Optionally specify a section to reset only that part.

## Implementation Considerations

1. **Storage**:
   - For development and small deployments, file-based storage is sufficient
   - For production and larger deployments, consider using MongoDB or another database

2. **Performance**:
   - Implement caching to avoid frequent file system or database access
   - Consider using Redis for distributed caching in multi-instance deployments

3. **Validation**:
   - Validate configurations against schema to prevent errors
   - Provide meaningful error messages for invalid configurations

4. **Security**:
   - Restrict configuration commands to server administrators
   - Sanitize and validate all user input
   - Log all configuration changes for audit purposes

5. **Backward Compatibility**:
   - Handle missing configuration properties gracefully
   - Provide defaults for all configuration options
   - Consider versioning the configuration schema for future changes