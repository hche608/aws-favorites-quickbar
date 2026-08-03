/**
 * Integration tests for error scenarios
 *
 * Tests verify that:
 * - Errors are surfaced (not silently swallowed)
 * - Each condition is handled explicitly
 * - No fallback patterns hide broken behavior
 */

import { setupChromeMocks, clearChromeMocks } from '../helpers/mocks';
import { teardownDOM, createMockElement } from '../helpers/dom-helpers';
import { setupGlobalNamespace, clearGlobalNamespace } from '../helpers/global-namespace';
import { AWSFavoriteClasses } from '../../src/types';

declare global {
  interface Window {
    AWSFavoritesQuickbar: any;
  }
}

/**
 * Helper: creates a quickbar with a native pinned service for CSS extraction
 */
function createQuickbarWithNative(serviceId: string = 'cloudformation'): HTMLOListElement {
  const quickbar = document.createElement('ol');
  quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

  const li = createMockElement('li', { className: 'native-li' });
  const anchor = createMockElement('a', {
    className: 'native-anchor',
    'data-testid': `awsc-nav-favorites-bar-${serviceId}`
  });
  const mainContainer = createMockElement('div', { className: 'native-container' });
  const iconWrapper = createMockElement('div', { className: 'native-icon-wrapper' });
  const icon = createMockElement('img', { className: 'native-icon' });
  const label = createMockElement('span', { className: 'native-label' });

  iconWrapper.appendChild(icon);
  mainContainer.appendChild(iconWrapper);
  mainContainer.appendChild(label);
  anchor.appendChild(mainContainer);
  li.appendChild(anchor);
  quickbar.appendChild(li);

  return quickbar;
}

const testClasses: AWSFavoriteClasses = {
  li: 'test-li',
  anchor: 'test-anchor',
  mainContainer: 'test-container',
  iconWrapper: 'test-icon-wrapper',
  icon: 'test-icon',
  label: 'test-label'
};

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

  describe('Explicit error handling', () => {
    it('should return false when quickbar element is not found', async () => {
      const services = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        }
      ];

      const result = await window.AWSFavoritesQuickbar.injectServices(services, null);
      expect(result).toBe(false);
    }, 15000);

    it('should return true when services array is empty', async () => {
      const quickbar = createQuickbarWithNative();
      document.body.appendChild(quickbar);

      const result = await window.AWSFavoritesQuickbar.injectServices([], quickbar);
      expect(result).toBe(true);
    });

    it('should return true when services is null', async () => {
      const quickbar = createQuickbarWithNative();
      document.body.appendChild(quickbar);

      const result = await window.AWSFavoritesQuickbar.injectServices(null, quickbar);
      expect(result).toBe(true);
    });

    it('should return false when no native pinned service exists (no CSS template)', async () => {
      // Quickbar without native pinned services
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
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

      const result = await window.AWSFavoritesQuickbar.injectServices(services, quickbar);
      expect(result).toBe(false);

      // Nothing should be injected
      const injectedItems = quickbar.querySelectorAll('[data-source]');
      expect(injectedItems.length).toBe(0);
    });

    it('should throw when localStorage write fails in saveServicesToStorage', () => {
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

      expect(() => {
        window.AWSFavoritesQuickbar.saveServicesToStorage(services);
      }).toThrow('QuotaExceededError');

      Storage.prototype.setItem = originalSetItem;
    });

    it('should return undefined from loadUserFavorites when storage is empty', async () => {
      const result = await window.AWSFavoritesQuickbar.loadUserFavorites();
      expect(result).toBeUndefined();
    });

    it('should handle malformed service objects in createServiceLink', () => {
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

      const validLink = window.AWSFavoritesQuickbar.createServiceLink(validService, testClasses);
      const nullIdLink = window.AWSFavoritesQuickbar.createServiceLink(nullIdService, testClasses);
      const missingIdLink = window.AWSFavoritesQuickbar.createServiceLink(missingIdService, testClasses);

      expect(validLink).not.toBeNull();
      expect(validLink.getAttribute('data-service-id')).toBe('s3');
      expect(nullIdLink).toBeNull();
      expect(missingIdLink).toBeNull();
    });

    it('should handle parsing failures in recently visited', async () => {
      const widget = document.createElement('div');
      widget.setAttribute('data-widget-type', 'recently-visited');
      document.body.appendChild(widget);

      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();

      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBe(0);
    });

    it('should handle missing DOM elements during parsing', async () => {
      const widget = document.createElement('div');
      widget.setAttribute('data-widget-type', 'recently-visited');

      const ariaLabel = document.createElement('div');
      ariaLabel.setAttribute('aria-label', 'Recently visited');

      const listItem1 = document.createElement('div');
      listItem1.className = 'listItem-123';
      ariaLabel.appendChild(listItem1);

      const listItem2 = document.createElement('div');
      listItem2.className = 'listItem-123';
      const link = document.createElement('a');
      link.textContent = 'Test Service';
      listItem2.appendChild(link);
      ariaLabel.appendChild(listItem2);

      widget.appendChild(ariaLabel);
      document.body.appendChild(widget);

      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();
      expect(Array.isArray(services)).toBe(true);
    });

    it('should handle icon loading with placeholder', async () => {
      const quickbar = createQuickbarWithNative();
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

      const result = await window.AWSFavoritesQuickbar.injectServices(services, quickbar);
      expect(result).toBe(true);

      const injectedItems = quickbar.querySelectorAll('li[data-source]');
      expect(injectedItems.length).toBe(1);

      const img = injectedItems[0].querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.onerror).not.toBeNull();
    });

    it('should handle merging with empty arrays', () => {
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

    it('should return false when quickbar is removed and has no native service', async () => {
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');
      document.body.appendChild(quickbar);
      quickbar.remove();

      const services = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        }
      ];

      const result = await window.AWSFavoritesQuickbar.injectServices(services, quickbar);
      expect(result).toBe(false);
    });
  });
});
