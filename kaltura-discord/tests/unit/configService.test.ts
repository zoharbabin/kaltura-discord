import { configService } from '../../src/services/configService';

// Mock the logger to prevent console output during tests
jest.mock('../../src/common/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Configuration Service', () => {
  // Reset mocks before each test
  beforeEach(async () => {
    jest.clearAllMocks();
    // Initialize the config service before each test
    await configService.initialize();
  });

  test('should load default configuration', async () => {
    // This is a simple test to verify the configService can load default configuration
    const config = await configService.getServerConfig('default');
    
    // Verify that the default configuration has expected properties
    expect(config).toBeDefined();
    expect(config.notifications).toBeDefined();
    expect(typeof config.notifications.enabled).toBe('boolean');
  });

  test('should get server configuration', async () => {
    // Test getting server configuration
    const serverId = 'test_server_123';
    const serverConfig = await configService.getServerConfig(serverId);
    
    // Verify that server configuration is returned
    expect(serverConfig).toBeDefined();
  });

  test('should save and load server configuration', async () => {
    // Test saving and loading server configuration
    const serverId = 'test_server_456';
    const testConfig = {
      notifications: {
        enabled: false,
        types: {},
        templates: {},
        channels: {
          default: 'general'
        }
      }
    };
    
    // Save the configuration
    await configService.saveServerConfig(serverId, testConfig);
    
    // Load the configuration
    const loadedConfig = await configService.getServerConfig(serverId);
    
    // Verify that the loaded configuration matches what we saved
    expect(loadedConfig.notifications.enabled).toBe(false);
  });

  test('should reset server configuration', async () => {
    // Test resetting server configuration
    const serverId = 'test_server_789';
    
    // First save a custom configuration
    const customConfig = {
      notifications: {
        enabled: false,
        types: {},
        templates: {},
        channels: {
          default: 'general'
        }
      }
    };
    await configService.saveServerConfig(serverId, customConfig);
    
    // Then reset it
    await configService.resetServerConfig(serverId);
    
    // Load the configuration and verify it's back to default
    const resetConfig = await configService.getServerConfig(serverId);
    const defaultConfig = await configService.getServerConfig('default');
    
    // The reset configuration should match the default
    expect(resetConfig.notifications.enabled).toBe(defaultConfig.notifications.enabled);
  });
});