# Discord Activity Architectural Decisions

## Overview

This document captures the key architectural decisions made for implementing the Discord Activity for the Kaltura Watch Together feature. These decisions have guided the development of the embedded experience within Discord voice channels and have been validated through implementation and testing.

## Architectural Decisions

### 1. **Discord Activity Implementation**
- **Decision**: Implement a proper Discord Activity using Discord's Activities API and embedded-app-sdk for the Watch Together feature
- **Rationale**: Provides a seamless, integrated experience for users to watch videos together directly within Discord voice channels
- **Implications**: Requires Discord Activities API access, additional development effort, but significantly enhances user experience
- **Date**: March 2025
- **Status**: Implemented and tested successfully

### 2. **Project Structure**
- **Decision**: Follow Discord Activity Starter example structure with client and server packages
- **Rationale**: Aligns with Discord's recommended approach and provides a clear separation of concerns
- **Implications**: Easier integration with Discord's ecosystem, better maintainability
- **Date**: March 2025
- **Status**: Implemented with client and server packages in discord-activity directory

### 3. **Frontend Technology**
- **Decision**: Use Vite with TypeScript for the client-side application
- **Rationale**: Fast development experience, excellent TypeScript support, and recommended by Discord
- **Implications**: Modern development workflow, better type safety, improved developer experience
- **Date**: March 2025
- **Status**: Implemented and working well for development and building

### 4. **Backend Technology**
- **Decision**: Use Express.js for the server-side application
- **Rationale**: Lightweight, flexible, and compatible with our existing Node.js ecosystem
- **Implications**: Consistent with our current technology stack, easier integration
- **Date**: March 2025
- **Status**: Implemented with Express.js server handling token exchange and API endpoints

### 5. **Synchronization Mechanism**
- **Decision**: Implement client-side synchronization using Discord SDK for communication
- **Rationale**: Leverages Discord's built-in communication channels for real-time synchronization
- **Implications**: More reliable synchronization, reduced server load, better user experience
- **Date**: March 2025
- **Status**: Implemented with host-based synchronization and message passing

### 6. **Fallback Mechanism**
- **Decision**: Maintain the current link-based Watch Together approach as a fallback
- **Rationale**: Ensures functionality even when Discord Activities API is unavailable
- **Implications**: Additional maintenance overhead but provides better reliability
- **Date**: March 2025
- **Status**: Implemented and working as expected when Activities API is not available

### 7. **Authentication Flow**
- **Decision**: Use Discord OAuth2 flow for authentication and token exchange
- **Rationale**: Secure, standard approach recommended by Discord
- **Implications**: Additional server-side handling for token exchange, but improved security
- **Date**: March 2025
- **Status**: Implemented with token exchange endpoint in server application

### 8. **Kaltura Player Integration**
- **Decision**: Create a custom wrapper around Kaltura Player SDK for Discord integration
- **Rationale**: Provides better control over player behavior and synchronization
- **Implications**: Additional development effort but better integration with Discord
- **Date**: March 2025
- **Status**: Implemented with KalturaPlayerManager class handling player initialization and control

### 9. **Host-Based Synchronization**
- **Decision**: Designate the user who initiated the activity as the "host" with control over playback
- **Rationale**: Simplifies synchronization model and provides clear authority
- **Implications**: Need to handle host disconnection scenarios and potential host transfers
- **Date**: March 2025
- **Status**: Implemented with host transfer capability when original host leaves

### 10. **Configuration Management**
- **Decision**: Add Discord Activities API configuration to the existing configuration service
- **Rationale**: Consistent with our current approach to configuration management
- **Implications**: Allows for server-specific customization of the Watch Together experience
- **Date**: March 2025
- **Status**: Implemented with server-specific configuration for Activities API access

### 11. **Mock Data for Initial Development**
- **Decision**: Use mock data for initial development of Discord Activity server endpoints
- **Rationale**: Allows for faster development and testing without requiring real API credentials
- **Implications**: Need to replace with real API calls before production deployment
- **Date**: March 2025
- **Status**: Implemented with mock endpoints, needs to be replaced with real API calls

### 12. **Mobile Compatibility**
- **Decision**: Optimize Discord Activity UI for mobile clients
- **Rationale**: Ensures consistent experience across all Discord clients
- **Implications**: Additional development effort for responsive design
- **Date**: March 2025
- **Status**: Basic implementation in place, needs further optimization

## Technical Constraints

1. **Discord Activities API Access**
   - Activities API requires approval from Discord
   - Development and testing will require a Discord developer account with Activities API access
   - **Status**: Access granted and configured for server ID 1283874310720716890

2. **Browser Compatibility**
   - Discord's embedded browser may have limitations
   - Need to ensure compatibility across different Discord clients (desktop, web, mobile)
   - **Status**: Working well on desktop, needs further testing on mobile

3. **Synchronization Challenges**
   - Network latency can cause desynchronization
   - Different device capabilities may affect playback
   - Need to implement adaptive synchronization with configurable tolerance
   - **Status**: Basic synchronization working with configurable tolerance, needs optimization for various network conditions

## Implementation Progress

1. **Completed Implementation**
   - Project structure with client and server packages
   - Discord SDK integration with authentication flow
   - Kaltura player integration with custom wrapper
   - Host-based synchronization mechanism
   - User interface with playback controls
   - Server-side endpoints for token exchange and mock data
   - Fallback mechanism for servers without Activities API access

2. **Pending Implementation**
   - Replace mock endpoints with real Kaltura API calls
   - Enhance user presence features
   - Optimize for mobile clients
   - Add analytics for usage tracking
   - Optimize synchronization for various network conditions

## Testing Results

1. **Integration Testing**
   - Successfully integrated with existing bot commands
   - Video search and Discord Activity launch working as expected
   - Fallback mechanism working when Activities API is not available

2. **Functional Testing**
   - Host-based synchronization working as expected
   - Playback controls (play, pause, seek) functioning correctly
   - Host transfer capability working when original host leaves

3. **Performance Testing**
   - Basic synchronization working with configurable tolerance
   - Need further testing with different video qualities and network conditions

## Conclusion

The architectural decisions outlined in this document have provided a solid foundation for implementing the Discord Activity for the Kaltura Watch Together feature. The implementation has validated these decisions and demonstrated the feasibility of the approach.

The Discord Activity implementation is now in the late stages of development, with the core functionality working as expected. The remaining work focuses on replacing mock endpoints with real API calls, enhancing user presence features, optimizing for mobile clients, and adding analytics for usage tracking.

These decisions and their implementation align with our overall architectural principles of maintaining clear separation between Discord and Kaltura integration layers, designing for stateless operation, and implementing graceful degradation for all features.