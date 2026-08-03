/**
 * Unit tests for DOM utilities (src/utils/dom.ts)
 * Requirements: 1.1
 */

import * as domModule from '../../../src/utils/dom';
const { waitForDOMReady, waitForElement, isAWSConsolePage, isAWSConsoleHomepage } = domModule;
import { teardownDOM } from '../../helpers/dom-helpers';
import { mockMutationObserver } from '../../helpers/mocks';

describe('DOM Utilities', () => {
  let MockMutationObserver: ReturnType<typeof mockMutationObserver>;

  beforeEach(() => {
    // Setup MutationObserver mock
    MockMutationObserver = mockMutationObserver();
    (globalThis as any).MutationObserver = MockMutationObserver;

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
    delete (globalThis as any).MutationObserver;
  });

  describe('waitForDOMReady', () => {
    it('should resolve immediately when document is already complete', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });

      const startTime = Date.now();
      await waitForDOMReady();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
    });

    it('should resolve immediately when document is interactive', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'interactive'
      });

      const startTime = Date.now();
      await waitForDOMReady();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
    });

    it('should wait for DOMContentLoaded when document is loading', async () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      const promise = waitForDOMReady();

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

      const element = await waitForElement(['#test-element']);

      expect(element).toBe(testDiv);
    });

    it('should check multiple selectors and return first match', async () => {
      const testDiv = document.createElement('div');
      testDiv.className = 'test-class';
      document.body.appendChild(testDiv);

      const element = await waitForElement([
        '#non-existent',
        '.test-class',
        '#another-non-existent'
      ]);

      expect(element).toBe(testDiv);
    });

    it('should wait for element to appear via MutationObserver', async () => {
      const promise = waitForElement(['#dynamic-element']);

      // Simulate element being added after a delay
      setTimeout(() => {
        const testDiv = document.createElement('div');
        testDiv.id = 'dynamic-element';
        document.body.appendChild(testDiv);

        // Trigger MutationObserver callback
        const observers = MockMutationObserver.instances;
        if (observers.length > 0) {
          observers[0].callback([{ type: 'childList' } as MutationRecord], observers[0]);
        }
      }, 10);

      const element = await promise;
      expect(element).toBeTruthy();
      expect(element?.id).toBe('dynamic-element');
    });

    it('should return null when timeout is reached', async () => {
      const element = await waitForElement(['#non-existent-element'], 100);

      expect(element).toBeNull();
    });

    it('should handle empty selector array', async () => {
      const element = await waitForElement([], 100);

      expect(element).toBeNull();
    });
  });

  describe('location accessors', () => {
    it('should return window.location.hostname', () => {
      const result = domModule.location.getHostname();
      expect(typeof result).toBe('string');
    });

    it('should return window.location.pathname', () => {
      const result = domModule.location.getPathname();
      expect(typeof result).toBe('string');
    });
  });

  describe('isAWSConsolePage', () => {
    afterEach(() => jest.restoreAllMocks());

    it('should return true for console.aws.amazon.com hostname', () => {
      jest.spyOn(domModule.location, 'getHostname').mockReturnValue('console.aws.amazon.com');
      expect(isAWSConsolePage()).toBe(true);
    });

    it('should return true for regional console hostnames', () => {
      jest
        .spyOn(domModule.location, 'getHostname')
        .mockReturnValue('us-west-2.console.aws.amazon.com');
      expect(isAWSConsolePage()).toBe(true);
    });

    it('should return false for non-AWS hostnames', () => {
      jest.spyOn(domModule.location, 'getHostname').mockReturnValue('example.com');
      expect(isAWSConsolePage()).toBe(false);
    });

    it('should return false for AWS but non-console hostnames', () => {
      jest.spyOn(domModule.location, 'getHostname').mockReturnValue('aws.amazon.com');
      expect(isAWSConsolePage()).toBe(false);
    });

    it('should return false for localhost', () => {
      jest.spyOn(domModule.location, 'getHostname').mockReturnValue('localhost');
      expect(isAWSConsolePage()).toBe(false);
    });
  });

  describe('isAWSConsoleHomepage', () => {
    afterEach(() => jest.restoreAllMocks());

    it('should return true for root path', () => {
      jest.spyOn(domModule.location, 'getPathname').mockReturnValue('/');
      expect(isAWSConsoleHomepage()).toBe(true);
    });

    it('should return true for /console/home path', () => {
      jest.spyOn(domModule.location, 'getPathname').mockReturnValue('/console/home');
      expect(isAWSConsoleHomepage()).toBe(true);
    });

    it('should return false for service-specific paths', () => {
      jest.spyOn(domModule.location, 'getPathname').mockReturnValue('/s3/home');
      expect(isAWSConsoleHomepage()).toBe(false);
    });

    it('should return false for /console path without /home', () => {
      jest.spyOn(domModule.location, 'getPathname').mockReturnValue('/console');
      expect(isAWSConsoleHomepage()).toBe(false);
    });

    it('should return false for paths with query parameters', () => {
      jest.spyOn(domModule.location, 'getPathname').mockReturnValue('/ec2/v2/home');
      expect(isAWSConsoleHomepage()).toBe(false);
    });
  });
});
