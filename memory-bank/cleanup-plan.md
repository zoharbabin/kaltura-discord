# Kaltura-Discord Integration Cleanup Plan

## Overview

This document outlines the plan for cleaning up redundant, unused, or no longer relevant files in the Kaltura-Discord integration project. The cleanup is based on a thorough review of the project files, documentation, and current architectural decisions.

## Files to Remove

### 1. Redundant Environment Variable Management Scripts

- **`cleanup-env.sh`**: This script creates separate `.env.development` and `.env.production` files from a single `.env` file. However, the project has moved to a simplified approach with a single `.env` file, making this script redundant.
- **`consolidate-env.sh`**: This script consolidates environment variables from separate files into a single file. Since the project now uses a single `.env` file, this script is redundant.

### 2. Redundant Environment Variable Files

The project now uses a single `.env` file with a symbolic link from `discord-activity/.env` to the main `.env` file. Any separate environment files should be removed:

- `.env.example` (if it exists)
- `.env.development.sample` (if it exists)
- `.env.production.sample` (if it exists)
- `.env.development` (if it exists)
- `.env.production` (if it exists)
- `discord-activity/.env.example` (if it exists)
- `discord-activity/.env.development` (if it exists)
- `discord-activity/.env.production` (if it exists)

### 3. Generated Files (Optional)

These files are generated during build and test processes and can be regenerated as needed:

- `coverage/` directory: Contains test coverage reports
- `dist/` directory: Contains compiled JavaScript files

## Files to Keep

### 1. Essential Environment Variable Management

- **`simplify-env.sh`**: This script implements the current approach of using a single `.env` file and should be kept.

### 2. Core Project Files

All other source files, configuration files, and documentation should be kept.

## Implementation Plan

1. **Backup**: Create a backup of the entire project before removing any files.
2. **Remove Redundant Scripts**: Delete `cleanup-env.sh` and `consolidate-env.sh`.
3. **Remove Redundant Environment Files**: Delete any separate environment files as listed above.
4. **Clean Generated Files (Optional)**: If desired, clean the `coverage/` and `dist/` directories, but ensure that build scripts are run afterward to regenerate necessary files.
5. **Update Documentation**: Update any documentation that references the removed files or processes.

## Verification Steps

After cleanup, verify that:

1. The project can still be built successfully.
2. The deployment scripts (`deploy-dev.sh` and `deploy-prod.sh`) still work correctly.
3. The environment variables are correctly loaded in both the main project and the Discord Activity component.
4. All tests pass successfully.

## Conclusion

This cleanup will simplify the project structure, remove redundant files, and ensure that the environment variable management follows the current architectural decision of using a single `.env` file. The cleanup should be performed carefully, with proper backups and verification steps to ensure that the project continues to function correctly.