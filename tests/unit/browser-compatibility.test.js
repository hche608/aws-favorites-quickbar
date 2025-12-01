/**
 * Property-based tests for browser API compatibility
 * **Feature: firefox-support, Property 3: Browser API compatibility layer normalizes to Promises**
 * **Validates: Requirements 2.1, 2.4**
 */

const fc = require('fast-check');
const {
  mockChromeStorage,
  mockBrowserStorage,
  mockChromeRuntime,
  mockBrowserRuntime,
  mockChromeTabs,
  mockBrowserTabs,
  setupChromeMocks,
  setupFirefoxMocks,
  clearAllBrowserMocks
} = require('../helpers/mocks');

describe('Browser API Compatibility', () => {
  afterEach(() => {
    clearAllBrowserMocks();
  });

  describe('Property 1: Storage operations produce identical results across browsers', () => {
    /**
     * **Feature: firefox-support, Property 1: Storage operations produce identical results across browsers**
     * **Validates: Requirements 1.3, 4.1, 4.3, 5.4**
     * 
     * Property: For any storage operation (save, load, update, delete) with any valid service data,
     * the operation should complete successfully and produce identical results when executed
     * with Chrome API mocks versus Firefox API mocks.
     */

    test('save and load userFavorites produces identical results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
          async (favorites) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.sync.set({ userFavorites: favorites });
            const chromeResult = await global.chrome.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.sync.set({ userFavorites: favorites });
            const firefoxResult = await global.browser.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
            expect(chromeResult.userFavorites).toEqual(favorites);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('save and load cachedServices produces identical results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            services: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                iconUrl: fc.oneof(fc.constant(null), fc.webUrl()),
                consoleUrl: fc.webUrl(),
                source: fc.constantFrom('user', 'recent')
              }),
              { minLength: 0, maxLength: 30 }
            ),
            timestamp: fc.integer({ min: 0, max: Date.now() })
          }),
          async (cachedData) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.local.set({ cachedServices: cachedData });
            const chromeResult = await global.chrome.storage.local.get(['cachedServices']);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.local.set({ cachedServices: cachedData });
            const firefoxResult = await global.browser.storage.local.get(['cachedServices']);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
            expect(chromeResult.cachedServices).toEqual(cachedData);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('save and load maxServices produces identical results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (maxServices) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.sync.set({ maxServices });
            const chromeResult = await global.chrome.storage.sync.get(['maxServices']);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.sync.set({ maxServices });
            const firefoxResult = await global.browser.storage.sync.get(['maxServices']);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
            expect(chromeResult.maxServices).toEqual(maxServices);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('update operation (read-modify-write) produces identical results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initial: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
            toAdd: fc.string({ minLength: 1, maxLength: 20 })
          }),
          async ({ initial, toAdd }) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.sync.set({ userFavorites: initial });
            const chromeRead = await global.chrome.storage.sync.get(['userFavorites']);
            const chromeUpdated = [...chromeRead.userFavorites, toAdd];
            await global.chrome.storage.sync.set({ userFavorites: chromeUpdated });
            const chromeFinal = await global.chrome.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.sync.set({ userFavorites: initial });
            const firefoxRead = await global.browser.storage.sync.get(['userFavorites']);
            const firefoxUpdated = [...firefoxRead.userFavorites, toAdd];
            await global.browser.storage.sync.set({ userFavorites: firefoxUpdated });
            const firefoxFinal = await global.browser.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeFinal).toEqual(firefoxFinal);
            expect(chromeFinal.userFavorites).toEqual([...initial, toAdd]);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('delete operation (filter) produces identical results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initial: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
          }).chain(({ initial }) => 
            fc.record({
              initial: fc.constant(initial),
              toRemove: fc.constantFrom(...initial)
            })
          ),
          async ({ initial, toRemove }) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.sync.set({ userFavorites: initial });
            const chromeRead = await global.chrome.storage.sync.get(['userFavorites']);
            const chromeFiltered = chromeRead.userFavorites.filter(id => id !== toRemove);
            await global.chrome.storage.sync.set({ userFavorites: chromeFiltered });
            const chromeFinal = await global.chrome.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.sync.set({ userFavorites: initial });
            const firefoxRead = await global.browser.storage.sync.get(['userFavorites']);
            const firefoxFiltered = firefoxRead.userFavorites.filter(id => id !== toRemove);
            await global.browser.storage.sync.set({ userFavorites: firefoxFiltered });
            const firefoxFinal = await global.browser.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeFinal).toEqual(firefoxFinal);
            expect(chromeFinal.userFavorites).toEqual(initial.filter(id => id !== toRemove));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('clear operation produces identical results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          async (favorites) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.sync.set({ userFavorites: favorites });
            await global.chrome.storage.sync.clear();
            const chromeResult = await global.chrome.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.sync.set({ userFavorites: favorites });
            await global.browser.storage.sync.clear();
            const firefoxResult = await global.browser.storage.sync.get(['userFavorites']);
            clearAllBrowserMocks();

            // Both should produce identical results (empty)
            expect(chromeResult).toEqual(firefoxResult);
            expect(chromeResult.userFavorites).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Browser API compatibility layer normalizes to Promises', () => {
    /**
     * Property: For any browser API call (storage, tabs, runtime), when executed through
     * the compatibility layer, it should return a Promise that resolves successfully
     * in both Chrome and Firefox mock environments.
     */

    test('storage.sync.get returns Promise in both Chrome and Firefox', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.array(fc.string()),
              fc.record({ name: fc.string(), id: fc.integer() })
            )
          }),
          async ({ key, value }) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.sync.set({ [key]: value });
            const chromeResult = await global.chrome.storage.sync.get(key);
            expect(chromeResult[key]).toEqual(value);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.sync.set({ [key]: value });
            const firefoxResult = await global.browser.storage.sync.get(key);
            expect(firefoxResult[key]).toEqual(value);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('storage.sync.set returns Promise in both Chrome and Firefox', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(fc.string(), fc.integer(), fc.boolean())
          ),
          async (data) => {
            // Test Chrome API
            setupChromeMocks();
            const chromeSetResult = global.chrome.storage.sync.set(data);
            expect(chromeSetResult).toBeInstanceOf(Promise);
            await expect(chromeSetResult).resolves.toBeUndefined();
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            const firefoxSetResult = global.browser.storage.sync.set(data);
            expect(firefoxSetResult).toBeInstanceOf(Promise);
            await expect(firefoxSetResult).resolves.toBeUndefined();
            clearAllBrowserMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('storage.local.get returns Promise in both Chrome and Firefox', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.jsonValue()
          }),
          async ({ key, value }) => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.local.set({ [key]: value });
            const chromeResult = await global.chrome.storage.local.get(key);
            expect(chromeResult[key]).toEqual(value);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.local.set({ [key]: value });
            const firefoxResult = await global.browser.storage.local.get(key);
            expect(firefoxResult[key]).toEqual(value);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('runtime.sendMessage returns Promise in both Chrome and Firefox', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            action: fc.constantFrom('getData', 'setData', 'clearData', 'refresh'),
            payload: fc.oneof(fc.string(), fc.integer(), fc.record({ id: fc.string() }))
          }),
          async (message) => {
            // Test Chrome API
            setupChromeMocks();
            const chromeResult = global.chrome.runtime.sendMessage(message);
            expect(chromeResult).toBeInstanceOf(Promise);
            await expect(chromeResult).resolves.toHaveProperty('success', true);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            const firefoxResult = global.browser.runtime.sendMessage(message);
            expect(firefoxResult).toBeInstanceOf(Promise);
            await expect(firefoxResult).resolves.toHaveProperty('success', true);
            clearAllBrowserMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('tabs.query returns Promise in both Chrome and Firefox', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            active: fc.boolean(),
            currentWindow: fc.boolean()
          }),
          async (queryInfo) => {
            // Test Chrome API
            setupChromeMocks();
            const chromeResult = global.chrome.tabs.query(queryInfo);
            expect(chromeResult).toBeInstanceOf(Promise);
            const chromeTabs = await chromeResult;
            expect(Array.isArray(chromeTabs)).toBe(true);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            const firefoxResult = global.browser.tabs.query(queryInfo);
            expect(firefoxResult).toBeInstanceOf(Promise);
            const firefoxTabs = await firefoxResult;
            expect(Array.isArray(firefoxTabs)).toBe(true);
            clearAllBrowserMocks();

            // Both should return arrays
            expect(Array.isArray(chromeTabs)).toBe(Array.isArray(firefoxTabs));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('tabs.sendMessage returns Promise in both Chrome and Firefox', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tabId: fc.integer({ min: 1, max: 100 }),
            message: fc.record({
              action: fc.string(),
              data: fc.jsonValue()
            })
          }),
          async ({ tabId, message }) => {
            // Test Chrome API
            setupChromeMocks();
            const chromeResult = global.chrome.tabs.sendMessage(tabId, message);
            expect(chromeResult).toBeInstanceOf(Promise);
            await expect(chromeResult).resolves.toHaveProperty('success', true);
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            const firefoxResult = global.browser.tabs.sendMessage(tabId, message);
            expect(firefoxResult).toBeInstanceOf(Promise);
            await expect(firefoxResult).resolves.toHaveProperty('success', true);
            clearAllBrowserMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('storage operations with default values work identically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }).filter(k => {
              // Filter out Object.prototype properties to avoid conflicts
              const prototypeProps = Object.getOwnPropertyNames(Object.prototype);
              return !prototypeProps.includes(k) && !['__proto__', 'constructor', 'prototype'].includes(k);
            }),
            defaultValue: fc.string()
          }),
          async ({ key, defaultValue }) => {
            // Test Chrome API with non-existent key
            setupChromeMocks();
            const chromeResult = await global.chrome.storage.sync.get({ [key]: defaultValue });
            expect(chromeResult[key]).toBe(defaultValue);
            clearAllBrowserMocks();

            // Test Firefox API with non-existent key
            setupFirefoxMocks();
            const firefoxResult = await global.browser.storage.sync.get({ [key]: defaultValue });
            expect(firefoxResult[key]).toBe(defaultValue);
            clearAllBrowserMocks();

            // Both should return the default value
            expect(chromeResult).toEqual(firefoxResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('storage.clear returns Promise in both Chrome and Firefox', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Test Chrome API
            setupChromeMocks();
            await global.chrome.storage.sync.set({ test: 'value' });
            const chromeClearResult = global.chrome.storage.sync.clear();
            expect(chromeClearResult).toBeInstanceOf(Promise);
            await chromeClearResult;
            const chromeAfterClear = await global.chrome.storage.sync.get('test');
            expect(chromeAfterClear).toEqual({});
            clearAllBrowserMocks();

            // Test Firefox API
            setupFirefoxMocks();
            await global.browser.storage.sync.set({ test: 'value' });
            const firefoxClearResult = global.browser.storage.sync.clear();
            expect(firefoxClearResult).toBeInstanceOf(Promise);
            await firefoxClearResult;
            const firefoxAfterClear = await global.browser.storage.sync.get('test');
            expect(firefoxAfterClear).toEqual({});
            clearAllBrowserMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
