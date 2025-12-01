/**
 * Property-based tests for core logic browser independence
 * **Feature: firefox-support, Property 2: Core logic produces browser-independent output**
 * **Validates: Requirements 4.2, 4.4, 4.5**
 */

const fc = require('fast-check');
const { JSDOM } = require('jsdom');
const {
  setupChromeMocks,
  setupFirefoxMocks,
  clearAllBrowserMocks
} = require('../helpers/mocks');

describe('Core Logic Browser Independence', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://console.aws.amazon.com/',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.Image = window.Image;
    global.URL = window.URL;
  });

  afterEach(() => {
    clearAllBrowserMocks();
    if (dom) {
      dom.window.close();
    }
    delete global.window;
    delete global.document;
    delete global.Image;
    delete global.URL;
  });

  /**
   * Helper to load source files into the DOM
   */
  function loadSourceFiles() {
    const fs = require('fs');
    const path = require('path');

    // Load the source files in order
    const files = [
      'src/quickbar/dom-builder.js',
      'src/services/service-merger.js',
      'src/services/icon-extractor.js',
      'src/services/recently-visited-parser.js'
    ];

    files.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const code = fs.readFileSync(filePath, 'utf8');
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    });
  }

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
            id: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('/')),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            iconUrl: fc.oneof(fc.constant(null), fc.webUrl()),
            consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
            source: fc.constantFrom('user', 'recent')
          }),
          async (service) => {
            // Test with Chrome environment
            setupChromeMocks();
            loadSourceFiles();
            const chromeElement = window.AWSFavoritesQuickbar.createServiceLink(service);
            const chromeHTML = chromeElement ? chromeElement.outerHTML : null;
            const chromeDataId = chromeElement ? chromeElement.getAttribute('data-service-id') : null;
            const chromeDataSource = chromeElement ? chromeElement.getAttribute('data-source') : null;
            const chromeAnchor = chromeElement ? chromeElement.querySelector('a') : null;
            const chromeHref = chromeAnchor ? chromeAnchor.href : null;
            clearAllBrowserMocks();
            dom.window.close();

            // Reset DOM
            dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
              url: 'https://console.aws.amazon.com/',
              runScripts: 'dangerously',
              resources: 'usable'
            });
            window = dom.window;
            document = window.document;
            global.window = window;
            global.document = document;
            global.Image = window.Image;
            global.URL = window.URL;

            // Test with Firefox environment
            setupFirefoxMocks();
            loadSourceFiles();
            const firefoxElement = window.AWSFavoritesQuickbar.createServiceLink(service);
            const firefoxHTML = firefoxElement ? firefoxElement.outerHTML : null;
            const firefoxDataId = firefoxElement ? firefoxElement.getAttribute('data-service-id') : null;
            const firefoxDataSource = firefoxElement ? firefoxElement.getAttribute('data-source') : null;
            const firefoxAnchor = firefoxElement ? firefoxElement.querySelector('a') : null;
            const firefoxHref = firefoxAnchor ? firefoxAnchor.href : null;
            clearAllBrowserMocks();

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
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Test with Chrome environment
            setupChromeMocks();
            loadSourceFiles();
            const chromeElement = window.AWSFavoritesQuickbar.createServiceLink(null);
            clearAllBrowserMocks();
            dom.window.close();

            // Reset DOM
            dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
              url: 'https://console.aws.amazon.com/',
              runScripts: 'dangerously',
              resources: 'usable'
            });
            window = dom.window;
            document = window.document;
            global.window = window;
            global.document = document;
            global.Image = window.Image;
            global.URL = window.URL;

            // Test with Firefox environment
            setupFirefoxMocks();
            loadSourceFiles();
            const firefoxElement = window.AWSFavoritesQuickbar.createServiceLink(null);
            clearAllBrowserMocks();

            // Both should return null
            expect(chromeElement).toBe(null);
            expect(firefoxElement).toBe(null);
          }
        ),
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
                consoleUrl: fc.webUrl(),
                source: fc.constant('user')
              }),
              { minLength: 0, maxLength: 10 }
            ),
            recentServices: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                iconUrl: fc.oneof(fc.constant(null), fc.webUrl()),
                consoleUrl: fc.webUrl(),
                source: fc.constant('recent')
              }),
              { minLength: 0, maxLength: 10 }
            )
          }),
          async ({ userFavorites, recentServices }) => {
            // Test with Chrome environment
            setupChromeMocks();
            loadSourceFiles();
            const chromeResult = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);
            clearAllBrowserMocks();
            dom.window.close();

            // Reset DOM
            dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
              url: 'https://console.aws.amazon.com/',
              runScripts: 'dangerously',
              resources: 'usable'
            });
            window = dom.window;
            document = window.document;
            global.window = window;
            global.document = document;
            global.Image = window.Image;
            global.URL = window.URL;

            // Test with Firefox environment
            setupFirefoxMocks();
            loadSourceFiles();
            const firefoxResult = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);
            clearAllBrowserMocks();

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
              { id: baseId, name: name, iconUrl: null, consoleUrl: 'https://example.com/1', source: 'user' },
              { id: baseId.toUpperCase(), name: name, iconUrl: null, consoleUrl: 'https://example.com/2', source: 'user' }
            ];
            const recentServices = [
              { id: baseId.toLowerCase(), name: name, iconUrl: null, consoleUrl: 'https://example.com/3', source: 'recent' }
            ];

            // Test with Chrome environment
            setupChromeMocks();
            loadSourceFiles();
            const chromeResult = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);
            clearAllBrowserMocks();
            dom.window.close();

            // Reset DOM
            dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
              url: 'https://console.aws.amazon.com/',
              runScripts: 'dangerously',
              resources: 'usable'
            });
            window = dom.window;
            document = window.document;
            global.window = window;
            global.document = document;
            global.Image = window.Image;
            global.URL = window.URL;

            // Test with Firefox environment
            setupFirefoxMocks();
            loadSourceFiles();
            const firefoxResult = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);
            clearAllBrowserMocks();

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

  describe('Property 2: Service extraction produces browser-independent output', () => {
    test('extractServiceFromLink produces identical results in Chrome and Firefox environments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serviceId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
            serviceName: fc.string({ minLength: 1, maxLength: 50 }),
            iconUrl: fc.oneof(fc.constant(null), fc.webUrl())
          }),
          async ({ serviceId, serviceName, iconUrl }) => {
            // Create a link element
            const createLink = (doc) => {
              const link = doc.createElement('a');
              link.href = `https://${serviceId}.console.aws.amazon.com/`;
              link.textContent = serviceName;
              if (iconUrl) {
                const img = doc.createElement('img');
                img.src = iconUrl;
                link.appendChild(img);
              }
              return link;
            };

            // Test with Chrome environment
            setupChromeMocks();
            loadSourceFiles();
            const chromeLink = createLink(document);
            const chromeResult = window.AWSFavoritesQuickbar.extractServiceFromLink(chromeLink, iconUrl);
            clearAllBrowserMocks();
            dom.window.close();

            // Reset DOM
            dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
              url: 'https://console.aws.amazon.com/',
              runScripts: 'dangerously',
              resources: 'usable'
            });
            window = dom.window;
            document = window.document;
            global.window = window;
            global.document = document;
            global.Image = window.Image;
            global.URL = window.URL;

            // Test with Firefox environment
            setupFirefoxMocks();
            loadSourceFiles();
            const firefoxLink = createLink(document);
            const firefoxResult = window.AWSFavoritesQuickbar.extractServiceFromLink(firefoxLink, iconUrl);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('extractServicesFromContainer produces identical results in Chrome and Firefox environments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              serviceId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
              serviceName: fc.string({ minLength: 1, maxLength: 50 }),
              iconUrl: fc.oneof(fc.constant(null), fc.webUrl())
            }),
            { minLength: 0, maxLength: 5 }
          ),
          async (services) => {
            // Create a container with service links
            const createContainer = (doc) => {
              const container = doc.createElement('div');
              services.forEach(({ serviceId, serviceName, iconUrl }) => {
                const item = doc.createElement('div');
                item.className = 'listItem-123';
                const link = doc.createElement('a');
                link.href = `https://${serviceId}.console.aws.amazon.com/`;
                link.textContent = serviceName;
                if (iconUrl) {
                  const img = doc.createElement('img');
                  img.src = iconUrl;
                  item.appendChild(img);
                }
                item.appendChild(link);
                container.appendChild(item);
              });
              return container;
            };

            // Test with Chrome environment
            setupChromeMocks();
            loadSourceFiles();
            const chromeContainer = createContainer(document);
            const chromeResult = window.AWSFavoritesQuickbar.extractServicesFromContainer(chromeContainer);
            clearAllBrowserMocks();
            dom.window.close();

            // Reset DOM
            dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
              url: 'https://console.aws.amazon.com/',
              runScripts: 'dangerously',
              resources: 'usable'
            });
            window = dom.window;
            document = window.document;
            global.window = window;
            global.document = document;
            global.Image = window.Image;
            global.URL = window.URL;

            // Test with Firefox environment
            setupFirefoxMocks();
            loadSourceFiles();
            const firefoxContainer = createContainer(document);
            const firefoxResult = window.AWSFavoritesQuickbar.extractServicesFromContainer(firefoxContainer);
            clearAllBrowserMocks();

            // Both should produce identical results
            expect(chromeResult).toEqual(firefoxResult);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
