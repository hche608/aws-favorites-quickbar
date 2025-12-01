/**
 * Unit tests for storage utilities (src/utils/storage.js)
 * Requirements: 1.2
 */

const { setupChromeMocks, setupFirefoxMocks, clearAllBrowserMocks, mockLocalStorage } = require('../../helpers/mocks');

describe('Storage Utilities', () => {
  beforeEach(() => {
    // Setup both Chrome and Firefox API mocks (source code uses browser.*)
    setupChromeMocks();
    setupFirefoxMocks();
    
    // Clear localStorage
    localStorage.clear();
    
    // Initialize the namespace
    window.AWSFavoritesQuickbar = {};
    
    // Load the module fresh
    jest.resetModules();
    require('../../../src/utils/storage');
    
    // Mock console methods
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  });

  afterEach(() => {
    clearAllBrowserMocks();
    localStorage.clear();
    jest.clearAllMocks();
    delete window.AWSFavoritesQuickbar;
  });

  describe('saveServicesToStorage', () => {
    it('should save services to localStorage with timestamp', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];

      window.AWSFavoritesQuickbar.saveServicesToStorage(services);

      const stored = localStorage.getItem('awsFavoritesQuickbar_services');
      expect(stored).toBeTruthy();

      const savedData = JSON.parse(stored);
      expect(savedData.services).toEqual(services);
      expect(savedData.timestamp).toBeDefined();
      expect(typeof savedData.timestamp).toBe('number');
    });

    it('should save services to browser.storage.local', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' }
      ];

      window.AWSFavoritesQuickbar.saveServicesToStorage(services);

      expect(browser.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedServices: expect.objectContaining({
            services: services,
            timestamp: expect.any(Number)
          })
        })
      );
    });

    it('should handle empty services array', () => {
      const services = [];

      window.AWSFavoritesQuickbar.saveServicesToStorage(services);

      const stored = localStorage.getItem('awsFavoritesQuickbar_services');
      const savedData = JSON.parse(stored);
      expect(savedData.services).toEqual([]);
    });

    it('should handle localStorage errors gracefully', () => {
      // Spy on localStorage.setItem and make it throw
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const services = [{ id: 's3', name: 'S3' }];
      
      // Should not throw
      expect(() => {
        window.AWSFavoritesQuickbar.saveServicesToStorage(services);
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'AWS Favorites Quickbar: Error saving to localStorage',
        expect.any(Error)
      );

      // Restore
      jest.restoreAllMocks();
    });

    it('should handle browser.storage errors gracefully', () => {
      browser.storage.local.set.mockRejectedValue(new Error('Browser storage error'));

      const services = [{ id: 's3', name: 'S3' }];
      
      window.AWSFavoritesQuickbar.saveServicesToStorage(services);

      // Should still save to localStorage
      const stored = localStorage.getItem('awsFavoritesQuickbar_services');
      expect(stored).toBeTruthy();
    });

    it('should handle invalid data gracefully', () => {
      const circularRef = {};
      circularRef.self = circularRef;

      // Should not throw even with circular reference
      expect(() => {
        window.AWSFavoritesQuickbar.saveServicesToStorage([circularRef]);
      }).not.toThrow();
    });
  });

  describe('loadServicesFromStorage', () => {
    it('should load services from localStorage', () => {
      const services = [
        { id: 's3', name: 'S3', iconUrl: 'https://example.com/s3.png', consoleUrl: 'https://console.aws.amazon.com/s3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'https://example.com/ec2.png', consoleUrl: 'https://console.aws.amazon.com/ec2' }
      ];
      const data = {
        services: services,
        timestamp: Date.now()
      };

      localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

      const result = window.AWSFavoritesQuickbar.loadServicesFromStorage();

      expect(result).toEqual(services);
    });

    it('should return empty array when no data exists', () => {
      const result = window.AWSFavoritesQuickbar.loadServicesFromStorage();

      expect(result).toEqual([]);
    });

    it('should return empty array when data is invalid JSON', () => {
      localStorage.setItem('awsFavoritesQuickbar_services', 'invalid json {');

      const result = window.AWSFavoritesQuickbar.loadServicesFromStorage();

      expect(result).toEqual([]);
    });

    it('should return empty array when services property is missing', () => {
      const data = {
        timestamp: Date.now()
      };
      localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

      const result = window.AWSFavoritesQuickbar.loadServicesFromStorage();

      expect(result).toEqual([]);
    });

    it('should handle localStorage errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      const result = window.AWSFavoritesQuickbar.loadServicesFromStorage();

      expect(result).toEqual([]);

      // Restore
      localStorage.getItem = originalGetItem;
    });

    it('should return empty array when data.services is null', () => {
      const data = {
        services: null,
        timestamp: Date.now()
      };
      localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

      const result = window.AWSFavoritesQuickbar.loadServicesFromStorage();

      expect(result).toEqual([]);
    });
  });

  describe('loadUserFavorites', () => {
    it('should load user favorites from browser.storage.sync', async () => {
      const favorites = [
        { id: 'dynamodb', name: 'DynamoDB', iconUrl: 'https://example.com/dynamodb.png', consoleUrl: 'https://console.aws.amazon.com/dynamodb' },
        { id: 'rds', name: 'RDS', iconUrl: 'https://example.com/rds.png', consoleUrl: 'https://console.aws.amazon.com/rds' }
      ];

      // Mock browser.storage.sync.get to return the favorites
      browser.storage.sync.get.mockResolvedValue({ userFavorites: favorites });

      const result = await window.AWSFavoritesQuickbar.loadUserFavorites();

      expect(browser.storage.sync.get).toHaveBeenCalledWith(['userFavorites']);
      expect(result).toEqual(favorites);
    });

    it('should return empty array when no favorites exist', async () => {
      const result = await window.AWSFavoritesQuickbar.loadUserFavorites();

      expect(result).toEqual([]);
    });

    it('should handle browser.storage errors gracefully', async () => {
      browser.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      const result = await window.AWSFavoritesQuickbar.loadUserFavorites();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'AWS Favorites Quickbar: Error loading favorites',
        expect.any(Error)
      );
    });

    it('should handle undefined userFavorites', async () => {
      browser.storage.sync.data = {};

      const result = await window.AWSFavoritesQuickbar.loadUserFavorites();

      expect(result).toEqual([]);
    });

    it('should handle null userFavorites', async () => {
      browser.storage.sync.data.userFavorites = null;

      const result = await window.AWSFavoritesQuickbar.loadUserFavorites();

      expect(result).toEqual([]);
    });
  });
});
