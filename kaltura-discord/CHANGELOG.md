# Changelog

All notable changes to the Kaltura-Discord Integration project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-03-07

### Added
- Initial release of the Kaltura-Discord Integration
- Discord Bot with slash commands for meeting management
  - `/kaltura-start`: Start a new Kaltura meeting
  - `/kaltura-join`: Join an existing Kaltura meeting
  - `/kaltura-list`: List all active Kaltura meetings
  - `/kaltura-end`: End a Kaltura meeting
- Configuration management commands
  - `/kaltura-config-view`: View the current configuration
  - `/kaltura-config-update`: Update a configuration setting
  - `/kaltura-config-reset`: Reset configuration to defaults
- API Gateway with RESTful endpoints
  - Authentication endpoints for token management
  - Meeting endpoints for creating, retrieving, and managing meetings
- User Authentication Service with Discord to Kaltura user mapping
- Configuration Service with server-specific customization
- Comprehensive documentation
  - Installation and setup guides
  - API documentation
  - Testing guides
  - Troubleshooting information

### Security
- JWT-based authentication for API endpoints
- Secure link generation for meeting join URLs
- Role-based access control for commands and API endpoints
- Environment variable management for sensitive credentials

## [0.9.0] - 2025-02-15

### Added
- Beta version with core functionality
- Discord Bot with basic commands
- API Gateway with authentication
- Kaltura API integration
- User mapping between Discord and Kaltura
- Basic configuration management

### Changed
- Improved error handling and logging
- Enhanced command validation
- Refined API response formats

### Fixed
- Discord command registration issues
- Kaltura session token handling
- Configuration loading and caching

## [0.5.0] - 2025-01-10

### Added
- Alpha version with limited functionality
- Initial Discord Bot implementation
- Basic Kaltura API integration
- Simple authentication mechanism
- Minimal configuration options

### Known Issues
- Limited error handling
- No server-specific configuration
- Basic role mapping only