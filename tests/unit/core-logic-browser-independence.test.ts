/**
 * Property-based tests for core logic browser independence
 * **Feature: firefox-support, Property 2: Core logic produces browser-independent output**
 * **Validates: Requirements 4.2, 4.4, 4.5**
 */

import * as fc from 'fast-check';
import { setupChromeMocks, setupFirefoxMocks, clearAllBrowserMocks } from '../helpers/mocks';
import { setupGlobalNamespace, clearGlobalNamespace } from '../helpers/global-namespace';

describe('Core Logic Browser Independence', () => {
  beforeEach(() => {
    clearAllBrowserMocks();
    clearGlobalNamespace();
  });

  afterEach(() => {
    clearAllBrowserMocks();
    clearGlobalNamespace();
  });

  describe('Property 2: DOM injection produces browser-independent output', () => {
    /**
     * For any core functionality (DOM injection, service parsing, icon extraction, service merging)
     * with any valid input data, the output should be identical regardless of which browser API
     * environment is used.
     */

    test('createServiceLink produces identical DOM structure in Chrome and Firefox environments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('/')),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            iconUrl: fc.oneof(fc.constant(null), fc.webUrl()),
            consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
            source: fc.constantFrom('user', 'recent')
          }),
          async (service) => {
            // Test with Chrome environment
            setupChromeMocks();
            setupGlobalNamespace();
            const chromeElement = window.AWSFavoritesQuickbar.createServiceLink(service);
            const chromeHTML = chromeElement ? chromeElement.outerHTML : null;
            const chromeDataId = chromeElement
              ? chromeElement.getAttribute('data-service-id')
              : null;
            const chromeDataSource = chromeElement
              ? chromeElement.getAttribute('data-source')
              : null;
            const chromeAnchor = chromeElement ? chromeElement.querySelector('a') : null;
            const chromeHref = chromeAnchor ? chromeAnchor.href : null;
            clearAllBrowserMocks();
            clearGlobalNamespace();

            // Test with Firefox environment
            setupFirefoxMocks();
            setupGlobalNamespace();
            const firefoxElement = window.AWSFavoritesQuickbar.createServiceLink(service);
            const firefoxHTML = firefoxElement ? firefoxElement.outerHTML : null;
            const firefoxDataId = firefoxElement
              ? firefoxElement.getAttribute('data-service-id')
              : null;
            const firefoxDataSource = firefoxElement
              ? firefoxElement.getAttribute('data-source')
              : null;
            const firefoxAnchor = firefoxElement ? firefoxElement.querySelector('a') : null;
            const firefoxHref = firefoxAnchor ? firefoxAnchor.href : null;
            clearAllBrowserMocks();
            clearGlobalNamespace();

            // Both should produce identical DOM structure
            expect(chromeHTML).toBe(firefoxHTML);
            expect(chromeDataId).toBe(firefoxDataId);
            expect(chromeDataSource).toBe(firefoxDataSource);
            expect(chromeHref).toBe(firefoxHref);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('createServiceLink with null service produces identical output', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Test with Chrome environment
          setupChromeMocks();
          setupGlobalNamespace();
          const chromeElement = window.AWSFavoritesQuickbar.createServiceLink(null);
          clearAllBrowserMocks();
          clearGlobalNamespace();

          // Test with Firefox environment
          setupFirefoxMocks();
          setupGlobalNamespace();
          const firefoxElement = window.AWSFavoritesQuickbar.createServiceLink(null);
          clearAllBrowserMocks();
          clearGlobalNamespace();

          // Both should return null
          expect(chromeElement).toBe(null);
          expect(firefoxElement).toBe(null);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Service merging produces browser-independent output', () => {
    test('mergeServices produces identical results in Chrome and Firefox environments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userFavorites: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                iconUrl: fc.oneof(fc.constant(null), fc.webUrl()),
                consoleUrl: fc.webUrl()
              }),
              { minLength: 0, maxLength: 10 }
            ),
            recentServices: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                iconUrl: fc.oneof(fc.constant(null), fc.webUrl()),
                consoleUrl: fc.webUrl()
              }),
              { minLength: 0, maxLength: 10 }
            )
          }),
          async ({ userFavorites, recentServices }) => {
            // Test with Chrome environment
            setupChromeMocks();
            setupGlobalNamespace();
            const chromeResult = window.AWSFavoritesQuickbar.mergeServices(
              userFavorites,
              recentServices
            );
            clearAllBrowserMocks();
            clearGlobalNamespace();

            // Test with Firefox environment
            setupFirefoxMocks();
            setupGlobalNamespace();
            const firefoxResult = window.AWSFavoritesQuickbar.mergeServices(
              userFavorites,
              recentServices
            );
            clearAllBrowserMocks();
            clearGlobalNamespace();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('mergeServices deduplication works identically across browsers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            baseId: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 })
          }),
          async ({ baseId, name }) => {
            // Create services with duplicate IDs (different cases)
            const userFavorites = [
              { id: baseId, name: name, iconUrl: null, consoleUrl: 'https://example.com/1' },
              {
                id: baseId.toUpperCase(),
                name: name,
                iconUrl: null,
                consoleUrl: 'https://example.com/2'
              }
            ];
            const recentServices = [
              {
                id: baseId.toLowerCase(),
                name: name,
                iconUrl: null,
                consoleUrl: 'https://example.com/3'
              }
            ];

            // Test with Chrome environment
            setupChromeMocks();
            setupGlobalNamespace();
            const chromeResult = window.AWSFavoritesQuickbar.mergeServices(
              userFavorites,
              recentServices
            );
            clearAllBrowserMocks();
            clearGlobalNamespace();

            // Test with Firefox environment
            setupFirefoxMocks();
            setupGlobalNamespace();
            const firefoxResult = window.AWSFavoritesQuickbar.mergeServices(
              userFavorites,
              recentServices
            );
            clearAllBrowserMocks();
            clearGlobalNamespace();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
            // Should only have one service (first occurrence from userFavorites)
            expect(chromeResult.length).toBe(1);
            expect(firefoxResult.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
