/**
 * Integration tests for error scenarios
 * Tests graceful degradation when components fail
 */

import { setupChromeMocks, clearChromeMocks } from '../helpers/mocks';
import { teardownDOM } from '../helpers/dom-helpers';
import { setupGlobalNamespace, clearGlobalNamespace } from '../helpers/global-namespace';

// Extend window interface
declare global {
  interface Window {
    AWSFavoritesQuickbar: any;
  }
}

describe('Error Scenarios Integration Tests', () => {
  beforeEach(() => {
    setupChromeMocks();
    setupGlobalNamespace();
    teardownDOM();
  });

  afterEach(() => {
    clearChromeMocks();
    clearGlobalNamespace();
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('Graceful degradation', () => {
    it('should handle missing quickbar element gracefully', async () => {
      // Arrange: No quickbar in DOM
      const services = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        }
      ];

      // Act: Try to inject without quickbar (will try to find one and timeout)
      const result = await window.AWSFavoritesQuickbar.injectServices(services, null);

      // Assert: Should return false but not throw
      expect(result).toBe(false);
    }, 15000);

    it('should handle empty services array gracefully', async () => {
      // Arrange
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-testid', 'favorites-bar-list');
      document.body.appendChild(quickbar);

      // Act: Inject empty array
      const result = await window.AWSFavoritesQuickbar.injectServices([], quickbar);

      // Assert: Should return true and not crash
      expect(result).toBe(true);
      const injectedItems = quickbar.querySelectorAll('li[data-source]');
      expect(injectedItems.length).toBe(0);
    });

    it('should handle null services gracefully', async () => {
      // Arrange
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-testid', 'favorites-bar-list');
      document.body.appendChild(quickbar);

      // Act: Inject null
      const result = await window.AWSFavoritesQuickbar.injectServices(null, quickbar);

      // Assert: Should return true and not crash
      expect(result).toBe(true);
      const injectedItems = quickbar.querySelectorAll('li[data-source]');
      expect(injectedItems.length).toBe(0);
    });

    it('should handle storage failures gracefully', async () => {
      // Arrange: Mock storage to fail and suppress console.error
      const originalGet = (global as any).chrome.storage.sync.get;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock chrome.storage.sync.get to trigger lastError
      (global as any).chrome.storage.sync.get = jest.fn((keys: any, callback: any) => {
        (global as any).chrome.runtime.lastError = { message: 'Storage error' };
        callback({});
        delete (global as any).chrome.runtime.lastError;
      });

      // Act: Try to load user favorites
      const favorites = await window.AWSFavoritesQuickbar.loadUserFavorites();

      // Assert: Should return empty array instead of throwing
      expect(favorites).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Cleanup
      (global as any).chrome.storage.sync.get = originalGet;
      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed service objects gracefully', () => {
      // Arrange: Test createServiceLink directly with malformed objects
      const validService = {
        id: 's3',
        name: 'S3',
        iconUrl: null,
        consoleUrl: 'https://console.aws.amazon.com/s3/home',
        source: 'user'
      };
      const nullIdService = {
        id: null,
        name: 'Invalid',
        iconUrl: null,
        consoleUrl: 'https://console.aws.amazon.com/test/home',
        source: 'user'
      };
      const missingIdService = {
        name: 'No ID',
        iconUrl: null,
        consoleUrl: 'https://console.aws.amazon.com/test/home',
        source: 'user'
      };

      // Act: Create service links
      const validLink = window.AWSFavoritesQuickbar.createServiceLink(validService);
      const nullIdLink = window.AWSFavoritesQuickbar.createServiceLink(nullIdService);
      const missingIdLink = window.AWSFavoritesQuickbar.createServiceLink(missingIdService);

      // Assert: Valid service should create a link, invalid ones should return null
      expect(validLink).not.toBeNull();
      expect(validLink.getAttribute('data-service-id')).toBe('s3');

      // Malformed services should be filtered out (return null)
      expect(nullIdLink).toBeNull();
      expect(missingIdLink).toBeNull();
    });

    it('should handle parsing failures gracefully', async () => {
      // Arrange: Create a malformed recently visited widget
      const widget = document.createElement('div');
      widget.setAttribute('data-widget-type', 'recently-visited');
      // No proper structure inside
      document.body.appendChild(widget);

      // Act: Try to parse
      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();

      // Assert: Should return empty array instead of throwing
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBe(0);
    });

    it('should handle localStorage failures gracefully', () => {
      // Arrange: Mock localStorage to fail
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const services = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        }
      ];

      // Act: Try to save to storage (should not throw)
      expect(() => {
        window.AWSFavoritesQuickbar.saveServicesToStorage(services);
      }).not.toThrow();

      // Cleanup
      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle missing DOM elements during parsing', async () => {
      // Arrange: Create widget with missing elements
      const widget = document.createElement('div');
      widget.setAttribute('data-widget-type', 'recently-visited');

      const ariaLabel = document.createElement('div');
      ariaLabel.setAttribute('aria-label', 'Recently visited');

      // Add items with missing links
      const listItem1 = document.createElement('div');
      listItem1.className = 'listItem-123';
      // No link inside
      ariaLabel.appendChild(listItem1);

      const listItem2 = document.createElement('div');
      listItem2.className = 'listItem-123';
      const link = document.createElement('a');
      // No href
      link.textContent = 'Test Service';
      listItem2.appendChild(link);
      ariaLabel.appendChild(listItem2);

      widget.appendChild(ariaLabel);
      document.body.appendChild(widget);

      // Act
      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();

      // Assert: Should handle gracefully
      expect(Array.isArray(services)).toBe(true);
      // May be empty or have partial results, but should not throw
    });

    it('should handle icon loading failures gracefully', async () => {
      // Arrange
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-testid', 'favorites-bar-list');
      document.body.appendChild(quickbar);

      const services = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://invalid-url.com/icon.png',
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        }
      ];

      // Act: Inject service with invalid icon URL
      const result = await window.AWSFavoritesQuickbar.injectServices(services, quickbar);

      // Assert: Should inject successfully with fallback icon
      expect(result).toBe(true);
      const injectedItems = quickbar.querySelectorAll('li[data-source]');
      expect(injectedItems.length).toBe(1);

      const img = injectedItems[0].querySelector('img');
      expect(img).not.toBeNull();
      // Icon should have onerror handler to fallback
      expect(img?.onerror).not.toBeNull();
    });

    it('should handle merging with empty arrays', () => {
      // Test all combinations of empty arrays
      const result1 = window.AWSFavoritesQuickbar.mergeServices([], []);
      expect(result1).toEqual([]);

      const userServices = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        }
      ];

      const result2 = window.AWSFavoritesQuickbar.mergeServices(userServices, []);
      expect(result2).toEqual(userServices);

      const recentServices = [
        {
          id: 'ec2',
          name: 'EC2',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/ec2/home',
          source: 'recent'
        }
      ];

      const result3 = window.AWSFavoritesQuickbar.mergeServices([], recentServices);
      expect(result3).toEqual(recentServices);
    });

    it('should handle quickbar removal during injection', async () => {
      // Arrange
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-testid', 'favorites-bar-list');
      document.body.appendChild(quickbar);

      const services = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        }
      ];

      // Remove quickbar from DOM
      quickbar.remove();

      // Act: Try to inject after removal
      const result = await window.AWSFavoritesQuickbar.injectServices(services, quickbar);

      // Assert: Should handle gracefully (quickbar is detached but still exists)
      expect(result).toBe(true);
    });
  });
});
