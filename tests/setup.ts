/**
 * Global test configuration and setup
 * This file runs before all tests to configure the test environment
 */

import { Service } from '../src/types';

// Polyfill TextEncoder/TextDecoder for jsdom
const { TextEncoder, TextDecoder } = require('util');
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidServiceElement(): R;
      toContainServiceWithId(serviceId: string): R;
      toHaveNoDuplicateIds(): R;
    }
  }
}

// Extend Jest matchers with custom matchers for service elements
expect.extend({
  toBeValidServiceElement(received: any) {
    const hasDataId = received && received.hasAttribute && received.hasAttribute('data-service-id');
    const hasAnchor = received && received.querySelector && received.querySelector('a') !== null;
    const pass = hasDataId && hasAnchor;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be a valid service element`
          : `Expected element to be a valid service element with data-service-id attribute and anchor tag`
    };
  },

  toContainServiceWithId(received: any, serviceId: string) {
    const pass =
      received &&
      Array.isArray(received) &&
      received.some(
        (service: Service) => service.id && service.id.toLowerCase() === serviceId.toLowerCase()
      );

    return {
      pass,
      message: () =>
        pass
          ? `Expected array not to contain service with id "${serviceId}"`
          : `Expected array to contain service with id "${serviceId}"`
    };
  },

  toHaveNoDuplicateIds(received: any) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `Expected an array but received ${typeof received}`
      };
    }

    const ids = received
      .map((item: any) => (item.id ? item.id.toLowerCase() : null))
      .filter(Boolean);
    const uniqueIds = new Set(ids);
    const pass = ids.length === uniqueIds.size;

    return {
      pass,
      message: () =>
        pass
          ? `Expected array to have duplicate IDs`
          : `Expected array to have no duplicate IDs, but found duplicates`
    };
  }
});

// Suppress console errors during tests unless explicitly needed
(global as any).console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn()
};

// Set up global test timeout
jest.setTimeout(5000);
