/**
 * Global test configuration and setup
 * This file runs before all tests to configure the test environment
 */

import { Service } from '../src/types';

// Polyfill TextEncoder/TextDecoder for jsdom
const { TextEncoder, TextDecoder } = require('util');
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Suppress jsdom "Not implemented: navigation" errors
// These fire when tests assign to window.location in Jest 30 jsdom
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const firstArg = args[0];
  if (firstArg instanceof Error && firstArg.message.includes('Not implemented')) return;
  if (typeof firstArg === 'string' && firstArg.includes('Not implemented')) return;
  // Check if any arg is an Error with "Not implemented"
  if (args.some((a) => a instanceof Error && a.message?.includes('Not implemented'))) return;
  if (args.some((a) => typeof a === 'object' && a?.type === 'not implemented')) return;
  originalConsoleError(...args);
};

// Custom matcher types
interface CustomMatchers<R = unknown> {
  toBeValidServiceElement(): R;
  toContainServiceWithId(serviceId: string): R;
  toHaveNoDuplicateIds(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

declare global {
  namespace jest {
    interface Matchers<R> extends CustomMatchers<R> {}
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
  error: vi.fn(),
  warn: vi.fn()
};

// Backwards compatibility alias so tests using jest.* API seamlessly work with vi
(globalThis as any).jest = {
  ...vi,
  isolateModules: (fn: () => void) => {
    vi.resetModules();
    fn();
  }
};
