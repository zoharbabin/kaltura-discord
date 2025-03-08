# Kaltura-Discord Integration System Patterns

## Architectural Patterns

### Microservices Architecture
The integration is designed as a collection of loosely coupled microservices, each with a specific responsibility:

1. **Discord Bot Service**: Handles Discord interactions and commands
2. **API Gateway**: Routes requests and manages authentication
3. **Kaltura Integration Service**: Interfaces with Kaltura APIs
4. **User Authentication Service**: Manages identity mapping and token generation
5. **Notification Service**: Handles webhooks and event notifications
6. **Configuration Service**: Manages server-specific configurations
7. **Discord Activity Service**: Provides embedded video watching experience

This approach allows for:
- Independent scaling of components based on load
- Isolated failure domains
- Technology flexibility for each service
- Independent deployment and versioning

### API Gateway Pattern
The API Gateway serves as the single entry point for all client-side requests, providing:
- Request routing
- API composition
- Protocol translation
- Authentication and authorization
- Rate limiting and throttling
- Version management

### Event-Driven Architecture
For notifications and asynchronous processes:
- Services communicate through events when appropriate
- Webhook events from Kaltura trigger Discord notifications
- Meeting lifecycle events are published to interested subscribers
- Video playback events synchronized between users in Discord Activity

### Configuration Management Pattern
For server-specific customization:
- Default configuration with override capability
- Hierarchical configuration structure
- Configuration caching with TTL
- Dynamic configuration reloading
- Environment variable placeholders in configuration ({{ENV_VAR_NAME}})
- Environment variables prioritized over configuration values

### Environment Variable Management Pattern
For secure and flexible configuration:
- Single `.env` file for both components
- Environment-specific variables set by deployment scripts at runtime
- Dedicated environment service to manage variable access
- Safe handling of special characters in environment variables
- Symbolic link for shared environment file between components

### Deployment Pattern
For consistent and reliable deployments:
- Separate scripts for development and production environments
- Environment-specific configuration set at runtime
- Pre-deployment testing to ensure code quality
- Cloudflare tunnel for local development
- Cloudflare Workers for production deployment
- Automated verification of deployment success

### Project Cleanup Pattern
For maintaining a clean and efficient codebase:
- Regular identification of redundant files and code
- Comprehensive cleanup planning before execution
- Automated cleanup scripts with proper backups
- Documentation of cleanup decisions and rationale
- Verification of functionality after cleanup
- Single source of truth for configuration and environment variables
- Removal of duplicate or obsolete implementation approaches

## Component Relationships

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Discord Bot    │◄────►│   API Gateway   │◄────►│ Kaltura API     │
│  Service        │      │   Service       │      │ Integration     │
│                 │      │                 │      │                 │
└─────────────────┘      └────────┬────────┘      └────────┬────────┘
                                  │                        │
                                  │                        │
                         ┌────────▼────────┐      ┌────────▼────────┐
                         │                 │      │                 │
                         │ User Auth &     │◄────►│ Notification &  │
                         │ Mapping Service │      │ Webhook Service │
                         │                 │      │                 │
                         └────────┬────────┘      └────────┬────────┘
                                  │                        │
                                  │                        │
                         ┌────────▼────────┐      ┌────────▼────────┐
                         │                 │      │                 │
                         │ Configuration   │◄────►│ Discord Activity│
                         │ Service         │      │ Service         │
                         │                 │      │                 │
                         └─────────────────┘      └─────────────────┘
```

## Data Flow Patterns

### Command Flow
1. User issues command in Discord
2. Discord Bot validates permissions
3. Request routed through API Gateway
4. Kaltura Integration Service creates session
5. User Auth Service generates tokens
6. Response returns to Discord Bot
7. Bot presents join options to user

### Notification Flow
1. Kaltura meeting event occurs
2. Webhook received by Notification Service
3. Configuration Service provides server preferences
4. Event processed and formatted using templates
5. Discord message sent to configured channel
6. Audit log entry created

### Configuration Flow
1. Default configuration loaded at startup
2. Environment variable placeholders replaced with actual values
3. Server-specific overrides applied when available
4. Configuration cached with TTL
5. Services request configuration from Configuration Service
6. Configuration reloaded when TTL expires

### Discord Activity Flow
1. User clicks "Watch Together" button in Discord
2. Discord Bot generates activity URL with metadata
3. User joins voice channel and launches activity
4. Discord Activity client initializes SDK and authenticates
5. Activity retrieves metadata and initializes player
6. SDK event subscriptions set up for layout and participants
7. Host controls synchronize playback across all users
8. Events are shared in real-time between participants
9. Activity adapts to different layout modes and orientations

## Security Patterns

### Token-Based Authentication
- Short-lived Kaltura Session (KS) tokens generated per user
- Tokens include user identity and role information
- No persistent storage of credentials

### Least Privilege Principle
- Discord Bot requests only necessary permissions
- API Gateway enforces role-based access control
- Kaltura sessions created with minimum required privileges

### Secure Communication
- All service-to-service communication over HTTPS
- API keys and tokens transmitted securely
- Sensitive data never logged or exposed
- Environment variables with special characters handled safely

## Resilience Patterns

### Circuit Breaker Pattern
- Prevents cascading failures when external services are unavailable
- Automatically retries with exponential backoff
- Provides fallback mechanisms when primary paths fail

### Graceful Degradation
- Link-based fallback when embedding is unavailable
- Reduced functionality mode when certain services are impaired
- Clear user messaging about service status
- Fallback to mock data when API calls fail in development

### Monitoring and Health Checks
- Each service exposes health endpoints
- Centralized monitoring of service status
- Automated alerting for service degradation
- Detailed logging for troubleshooting

## Scalability Patterns

### Horizontal Scaling
- Stateless services allow for easy replication
- Load balancing across service instances
- Auto-scaling based on demand metrics
- Cloudflare for global content delivery

### Caching Strategy
- Cache frequently used Discord server configurations
- Cache Kaltura session metadata (not tokens)
- Distributed cache for high availability
- Environment-specific caching policies

## Versioning Patterns

### Semantic Versioning
- Major.Minor.Patch version format
- Major version for breaking changes
- Minor version for backward-compatible features
- Patch version for backward-compatible fixes

### API Versioning
- URL-based versioning (/api/v1/resource)
- Version compatibility layer
- Deprecation notices and sunset policies

### Command Versioning
- Version metadata in command definitions
- Command compatibility layer
- Graceful handling of deprecated commands

## Discord Activity Patterns

### SDK Integration Pattern
- Use Discord's embedded-app-sdk for communication with Discord
- Follow the recommended SDK initialization pattern
- Implement proper error handling for SDK operations
- Use SDK-provided methods for participant management
- Subscribe to SDK events for layout and orientation changes

### Authentication Pattern
- Use the recommended OAuth2 flow for authorization
- Exchange authorization code for token via server-side endpoint
- Authenticate with Discord client using the token
- Secure token exchange with proper CSP compliance
- Store tokens securely and handle expiration

### Participant Management Pattern
- Use SDK's getInstanceConnectedParticipants for participant tracking
- Subscribe to ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE events
- Implement host selection and transfer logic
- Handle participant join/leave events
- Update UI to reflect participant status

### Layout Adaptation Pattern
- Subscribe to ACTIVITY_LAYOUT_MODE_UPDATE events
- Handle different layout modes (focused, PIP, grid)
- Subscribe to ORIENTATION_UPDATE events
- Optimize UI for different orientations (portrait, landscape)
- Set orientation lock for mobile devices when appropriate

### Synchronization Pattern
- Implement host-based synchronization for video playback
- Consider network conditions in synchronization logic
- Use adaptive sync intervals based on network quality
- Implement dynamic tolerance for synchronization
- Provide visual feedback during synchronization

### Error Handling Pattern
- Implement comprehensive error handling for SDK operations
- Provide user-friendly error messages
- Create fallback mechanisms for unsupported features
- Implement graceful degradation for error scenarios
- Log errors for debugging and analytics

## Development Patterns

### API-First Design
- Define service interfaces before implementation
- Use OpenAPI/Swagger for API documentation
- Contract-based testing between services

### Infrastructure as Code
- All infrastructure defined in code (e.g., Terraform)
- Containerized services with Docker
- Kubernetes for orchestration and scaling
- Cloudflare Workers for serverless deployment

### Continuous Integration/Deployment
- Automated testing for all components
- Deployment scripts for consistent deployments
- Pre-deployment testing to ensure code quality
- Environment-specific configuration set at runtime
- Feature flags for controlled rollout

### Environment Management
- Single source of truth for environment variables
- Environment-specific variables set at runtime
- Safe handling of special characters in environment variables
- Symbolic link for shared environment file between components
- Environment variable placeholders in configuration

### Code Cleanup and Maintenance
- Regular identification of redundant files and code
- Comprehensive planning before cleanup execution
- Automated cleanup scripts with proper backups
- Documentation of cleanup decisions and rationale
- Verification of functionality after cleanup
- Removal of duplicate or obsolete implementation approaches
- Standardization of error handling and logging patterns