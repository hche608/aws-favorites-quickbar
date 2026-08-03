/**
 * Integration tests for content script
 * Tests complete injection workflow from init to DOM
 */

import { setupChromeMocks, clearChromeMocks } from '../helpers/mocks';
import { createAWSConsolePageDOM } from '../helpers/fixtures';
import { teardownDOM } from '../helpers/dom-helpers';
import { setupGlobalNamespace, clearGlobalNamespace } from '../helpers/global-namespace';

// Extend window interface for test globals
declare global {
  interface Window {
    AWSFavoritesQuickbar: any;
  }
}

describe('Content Script Integration', () => {
  beforeEach(() => {
    setupChromeMocks();
    setupGlobalNamespace();
    teardownDOM();

    // Mock window.location for AWS Console
    delete (window as any).location;
    (window as any).location = {
      hostname: 'us-east-1.console.aws.amazon.com',
      pathname: '/console/home',
      href: 'https://us-east-1.console.aws.amazon.com/console/home'
    };

    // Set document ready state
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'complete'
    });
  });

  afterEach(() => {
    clearChromeMocks();
    clearGlobalNamespace();
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('Complete injection workflow', () => {
    it('should inject services from user favorites and recent services', async () => {
      // Arrange: Setup DOM with quickbar and recently visited widget
      createAWSConsolePageDOM({
        includeQuickbar: true,
        includeRecentlyVisited: true,
        includeNativeFavorites: false
      });

      // Add quickbar with proper selector and a native pinned service (for CSS extraction)
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      // Native pinned service provides CSS template
      const nativeLi = document.createElement('li');
      nativeLi.className = 'native-li';
      const nativeAnchor = document.createElement('a');
      nativeAnchor.className = 'native-anchor';
      nativeAnchor.setAttribute('data-testid', 'awsc-nav-favorites-bar-cloudformation');
      const nativeContainer = document.createElement('div');
      nativeContainer.className = 'native-container';
      const nativeIconWrapper = document.createElement('div');
      nativeIconWrapper.className = 'native-icon-wrapper';
      const nativeIcon = document.createElement('img');
      nativeIcon.className = 'native-icon';
      const nativeLabel = document.createElement('span');
      nativeLabel.className = 'native-label';
      nativeIconWrapper.appendChild(nativeIcon);
      nativeContainer.appendChild(nativeIconWrapper);
      nativeContainer.appendChild(nativeLabel);
      nativeAnchor.appendChild(nativeContainer);
      nativeLi.appendChild(nativeAnchor);
      quickbar.appendChild(nativeLi);

      document.body.appendChild(quickbar);

      // Setup user favorites in storage
      const userFavorites = ['dynamodb', 'rds'];
      (global as any).chrome.storage.sync.data.userFavorites = userFavorites;

      // Setup recently visited widget with proper structure
      const widget = document.createElement('div');
      widget.setAttribute('data-widget-type', 'recently-visited');

      const ariaLabel = document.createElement('div');
      ariaLabel.setAttribute('aria-label', 'Recently visited');

      const services = [
        { id: 's3', name: 'S3', url: 'https://console.aws.amazon.com/s3/home' },
        { id: 'ec2', name: 'EC2', url: 'https://console.aws.amazon.com/ec2/home' },
        { id: 'lambda', name: 'Lambda', url: 'https://console.aws.amazon.com/lambda/home' },
        { id: 'dynamodb', name: 'DynamoDB', url: 'https://console.aws.amazon.com/dynamodb/home' }
      ];

      services.forEach((service) => {
        const listItem = document.createElement('div');
        listItem.className = 'listItem-123';

        const link = document.createElement('a');
        link.href = service.url;
        link.textContent = service.name;

        const img = document.createElement('img');
        img.src = `https://console.aws.amazon.com/${service.id}/icon.png`;
        link.appendChild(img);

        listItem.appendChild(link);
        ariaLabel.appendChild(listItem);
      });

      widget.appendChild(ariaLabel);
      document.body.appendChild(widget);

      // Act: Execute the injection workflow
      const widgetLoaded = await window.AWSFavoritesQuickbar.waitForRecentlyVisitedWidget(2000);
      expect(widgetLoaded).toBe(true);

      const recentServices = await window.AWSFavoritesQuickbar.parseRecentlyVisited();
      expect(recentServices.length).toBeGreaterThan(0);

      // Create user favorite services
      const userFavoriteServices = userFavorites.map((id) => {
        const recent = recentServices.find((s: any) => s.id.toLowerCase() === id.toLowerCase());
        if (recent) {
          return { ...recent, source: 'user' };
        }
        return {
          id: id,
          name: id.toUpperCase(),
          iconUrl: null,
          consoleUrl: `https://us-east-1.console.aws.amazon.com/${id}/home?region=us-east-1`,
          source: 'user'
        };
      });

      const mergedServices = window.AWSFavoritesQuickbar.mergeServices(
        userFavoriteServices,
        recentServices
      );

      await window.AWSFavoritesQuickbar.injectServices(mergedServices, quickbar);

      // Assert: Verify services are injected correctly
      const injectedItems = quickbar.querySelectorAll('li[data-source]');
      expect(injectedItems.length).toBeGreaterThan(0);

      // Verify user favorites appear first
      const firstItem = injectedItems[0];
      expect(firstItem.getAttribute('data-source')).toBe('user');
      expect(['dynamodb', 'rds']).toContain(firstItem.getAttribute('data-service-id'));

      // Verify all user favorites are present
      const userServiceIds = Array.from(injectedItems)
        .filter((item) => item.getAttribute('data-source') === 'user')
        .map((item) => item.getAttribute('data-service-id'));

      expect(userServiceIds).toContain('dynamodb');
      expect(userServiceIds).toContain('rds');

      // Verify recent services are present (excluding duplicates)
      const recentServiceIds = Array.from(injectedItems)
        .filter((item) => item.getAttribute('data-source') === 'recent')
        .map((item) => item.getAttribute('data-service-id'));

      expect(recentServiceIds).toContain('s3');
      expect(recentServiceIds).toContain('ec2');
      expect(recentServiceIds).toContain('lambda');

      // Verify no duplicate dynamodb (it's in user favorites)
      const allServiceIds = Array.from(injectedItems).map((item) =>
        item.getAttribute('data-service-id')
      );
      const dynamodbCount = allServiceIds.filter((id) => id === 'dynamodb').length;
      expect(dynamodbCount).toBe(1);
    });

    it('should handle empty user favorites', async () => {
      // Arrange
      createAWSConsolePageDOM({
        includeQuickbar: true,
        includeRecentlyVisited: true
      });

      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      // Native pinned service for CSS extraction
      const nativeLi = document.createElement('li');
      nativeLi.className = 'native-li';
      const nativeAnchor = document.createElement('a');
      nativeAnchor.className = 'native-anchor';
      nativeAnchor.setAttribute('data-testid', 'awsc-nav-favorites-bar-cloudformation');
      const nativeContainer = document.createElement('div');
      nativeContainer.className = 'native-container';
      const nativeIconWrapper = document.createElement('div');
      nativeIconWrapper.className = 'native-icon-wrapper';
      const nativeIcon = document.createElement('img');
      nativeIcon.className = 'native-icon';
      const nativeLabel = document.createElement('span');
      nativeLabel.className = 'native-label';
      nativeIconWrapper.appendChild(nativeIcon);
      nativeContainer.appendChild(nativeIconWrapper);
      nativeContainer.appendChild(nativeLabel);
      nativeAnchor.appendChild(nativeContainer);
      nativeLi.appendChild(nativeAnchor);
      quickbar.appendChild(nativeLi);

      document.body.appendChild(quickbar);

      (global as any).chrome.storage.sync.data.userFavorites = [];

      const widget = document.createElement('div');
      widget.setAttribute('data-widget-type', 'recently-visited');

      const ariaLabel = document.createElement('div');
      ariaLabel.setAttribute('aria-label', 'Recently visited');

      const services = [
        { id: 's3', name: 'S3', url: 'https://console.aws.amazon.com/s3/home' },
        { id: 'ec2', name: 'EC2', url: 'https://console.aws.amazon.com/ec2/home' },
        { id: 'lambda', name: 'Lambda', url: 'https://console.aws.amazon.com/lambda/home' }
      ];

      services.forEach((service) => {
        const listItem = document.createElement('div');
        listItem.className = 'listItem-123';

        const link = document.createElement('a');
        link.href = service.url;
        link.textContent = service.name;

        listItem.appendChild(link);
        ariaLabel.appendChild(listItem);
      });

      widget.appendChild(ariaLabel);
      document.body.appendChild(widget);

      // Act
      const widgetLoaded = await window.AWSFavoritesQuickbar.waitForRecentlyVisitedWidget(2000);
      const recentServices = await window.AWSFavoritesQuickbar.parseRecentlyVisited();
      const mergedServices = window.AWSFavoritesQuickbar.mergeServices([], recentServices);
      await window.AWSFavoritesQuickbar.injectServices(mergedServices, quickbar);

      // Assert
      const injectedItems = quickbar.querySelectorAll('li[data-source="recent"]');
      expect(injectedItems.length).toBe(3);
    }, 10000);
  });

  describe('Background icon update workflow', () => {
    it('should update icons without disrupting quickbar', async () => {
      // Arrange: quickbar with native pinned service for CSS extraction
      const quickbar = document.createElement('ol');
      quickbar.setAttribute('data-rbd-droppable-id', 'global-nav-favorites-bar-list-edit-mode');

      const nativeLi = document.createElement('li');
      nativeLi.className = 'native-li';
      const nativeAnchor = document.createElement('a');
      nativeAnchor.className = 'native-anchor';
      nativeAnchor.setAttribute('data-testid', 'awsc-nav-favorites-bar-cloudformation');
      const nativeContainer = document.createElement('div');
      nativeContainer.className = 'native-container';
      const nativeIconWrapper = document.createElement('div');
      nativeIconWrapper.className = 'native-icon-wrapper';
      const nativeIcon = document.createElement('img');
      nativeIcon.className = 'native-icon';
      const nativeLabel = document.createElement('span');
      nativeLabel.className = 'native-label';
      nativeIconWrapper.appendChild(nativeIcon);
      nativeContainer.appendChild(nativeIconWrapper);
      nativeContainer.appendChild(nativeLabel);
      nativeAnchor.appendChild(nativeContainer);
      nativeLi.appendChild(nativeAnchor);
      quickbar.appendChild(nativeLi);

      document.body.appendChild(quickbar);

      const initialServices = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        },
        {
          id: 'ec2',
          name: 'EC2',
          iconUrl: null,
          consoleUrl: 'https://console.aws.amazon.com/ec2/home',
          source: 'recent'
        }
      ];

      // Initial injection
      const result1 = await window.AWSFavoritesQuickbar.injectServices(initialServices, quickbar);
      expect(result1).toBe(true);

      const initialCount = quickbar.querySelectorAll('li[data-source]').length;
      expect(initialCount).toBe(2);

      // Act: Update with new icons
      const updatedServices = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://console.aws.amazon.com/s3/new-icon.png',
          consoleUrl: 'https://console.aws.amazon.com/s3/home',
          source: 'user'
        },
        {
          id: 'ec2',
          name: 'EC2',
          iconUrl: 'https://console.aws.amazon.com/ec2/new-icon.png',
          consoleUrl: 'https://console.aws.amazon.com/ec2/home',
          source: 'recent'
        }
      ];

      const result2 = await window.AWSFavoritesQuickbar.injectServices(updatedServices, quickbar);
      expect(result2).toBe(true);

      // Assert: Verify icons are updated
      const updatedCount = quickbar.querySelectorAll('li[data-source]').length;
      expect(updatedCount).toBe(2);

      const s3Item = quickbar.querySelector('li[data-service-id="s3"]');
      const s3Icon = s3Item?.querySelector('img');
      expect(s3Icon?.src).toContain('new-icon.png');

      const ec2Item = quickbar.querySelector('li[data-service-id="ec2"]');
      const ec2Icon = ec2Item?.querySelector('img');
      expect(ec2Icon?.src).toContain('new-icon.png');
    }, 10000);
  });
});
