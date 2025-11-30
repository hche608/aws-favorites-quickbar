/**
 * Unit tests for DOM utilities (src/utils/dom.js)
 * Requirements: 1.1
 */

const { teardownDOM } = require('../../helpers/dom-helpers');
const { mockMutationObserver } = require('../../helpers/mocks');

describe('DOM Utilities', () => {
  let originalLocation;
  let MockMutationObserver;

  beforeEach(() => {
    // Load the module
    require('../../../src/utils/dom');
    
    // Store original location
    originalLocation = window.location;
    
    // Setup MutationObserver mock
    MockMutationObserver = mockMutationObserver();
    global.MutationObserver = MockMutationObserver;
    
    // Reset document state
    document.body.innerHTML = '';
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'complete'
    });
  });

  afterEach(() => {
    teardownDOM();
    jest.clearAllMocks();
    delete global.MutationObserver;
  });

  describe('waitForDOMReady', () => {
    it('should resolve immediately when document is already complete', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      const startTime = Date.now();
      await window.AWSFavoritesQuickbar.waitForDOMReady();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
    });

    it('should resolve immediately when document is interactive', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'interactive'
      });

      const startTime = Date.now();
      await window.AWSFavoritesQuickbar.waitForDOMReady();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
    });

    it('should wait for DOMContentLoaded when document is loading', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      const promise = window.AWSFavoritesQuickbar.waitForDOMReady();
      
      // Simulate DOMContentLoaded event
      setTimeout(() => {
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
      }, 10);

      await promise;
      expect(true).toBe(true); // If we get here, the promise resolved
    });
  });

  describe('waitForElement', () => {
    it('should resolve immediately when element exists', async () => {
      const testDiv = document.createElement('div');
      testDiv.id = 'test-element';
      document.body.appendChild(testDiv);

      const element = await window.AWSFavoritesQuickbar.waitForElement(['#test-element']);
      
      expect(element).toBe(testDiv);
    });

    it('should check multiple selectors and return first match', async () => {
      const testDiv = document.createElement('div');
      testDiv.className = 'test-class';
      document.body.appendChild(testDiv);

      const element = await window.AWSFavoritesQuickbar.waitForElement([
        '#non-existent',
        '.test-class',
        '#another-non-existent'
      ]);
      
      expect(element).toBe(testDiv);
    });

    it('should wait for element to appear via MutationObserver', async () => {
      const promise = window.AWSFavoritesQuickbar.waitForElement(['#dynamic-element']);
      
      // Simulate element being added after a delay
      setTimeout(() => {
        const testDiv = document.createElement('div');
        testDiv.id = 'dynamic-element';
        document.body.appendChild(testDiv);
        
        // Trigger MutationObserver callback
        const observers = MockMutationObserver.instances;
        if (observers.length > 0) {
          observers[0].callback([{ type: 'childList' }], observers[0]);
        }
      }, 10);

      const element = await promise;
      expect(element).toBeTruthy();
      expect(element.id).toBe('dynamic-element');
    });

    it('should return null when timeout is reached', async () => {
      const element = await window.AWSFavoritesQuickbar.waitForElement(
        ['#non-existent-element'],
        100
      );
      
      expect(element).toBeNull();
    });

    it('should handle empty selector array', async () => {
      const element = await window.AWSFavoritesQuickbar.waitForElement([], 100);
      
      expect(element).toBeNull();
    });
  });

  describe('isAWSConsolePage', () => {
    it('should return true for console.aws.amazon.com hostname', () => {
      delete window.location;
      window.location = { hostname: 'console.aws.amazon.com' };

      const result = window.AWSFavoritesQuickbar.isAWSConsolePage();
      
      expect(result).toBe(true);
    });

    it('should return true for regional console hostnames', () => {
      delete window.location;
      window.location = { hostname: 'us-west-2.console.aws.amazon.com' };

      const result = window.AWSFavoritesQuickbar.isAWSConsolePage();
      
      expect(result).toBe(true);
    });

    it('should return false for non-AWS hostnames', () => {
      delete window.location;
      window.location = { hostname: 'example.com' };

      const result = window.AWSFavoritesQuickbar.isAWSConsolePage();
      
      expect(result).toBe(false);
    });

    it('should return false for AWS but non-console hostnames', () => {
      delete window.location;
      window.location = { hostname: 'aws.amazon.com' };

      const result = window.AWSFavoritesQuickbar.isAWSConsolePage();
      
      expect(result).toBe(false);
    });

    it('should return false for localhost', () => {
      delete window.location;
      window.location = { hostname: 'localhost' };

      const result = window.AWSFavoritesQuickbar.isAWSConsolePage();
      
      expect(result).toBe(false);
    });
  });

  describe('isAWSConsoleHomepage', () => {
    it('should return true for root path', () => {
      delete window.location;
      window.location = { pathname: '/' };

      const result = window.AWSFavoritesQuickbar.isAWSConsoleHomepage();
      
      expect(result).toBe(true);
    });

    it('should return true for /console/home path', () => {
      delete window.location;
      window.location = { pathname: '/console/home' };

      const result = window.AWSFavoritesQuickbar.isAWSConsoleHomepage();
      
      expect(result).toBe(true);
    });

    it('should return false for service-specific paths', () => {
      delete window.location;
      window.location = { pathname: '/s3/home' };

      const result = window.AWSFavoritesQuickbar.isAWSConsoleHomepage();
      
      expect(result).toBe(false);
    });

    it('should return false for /console path without /home', () => {
      delete window.location;
      window.location = { pathname: '/console' };

      const result = window.AWSFavoritesQuickbar.isAWSConsoleHomepage();
      
      expect(result).toBe(false);
    });

    it('should return false for paths with query parameters', () => {
      delete window.location;
      window.location = { pathname: '/ec2/v2/home' };

      const result = window.AWSFavoritesQuickbar.isAWSConsoleHomepage();
      
      expect(result).toBe(false);
    });
  });
});
