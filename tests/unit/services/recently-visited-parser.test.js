/**
 * Unit tests for recently-visited-parser.js
 * Tests parsing of Recently Visited widget from AWS Console
 */

const { setupDOM, teardownDOM, createMockElement } = require('../../helpers/dom-helpers');
const { mockMutationObserver } = require('../../helpers/mocks');

describe('recently-visited-parser', () => {
  let originalMutationObserver;

  beforeEach(() => {
    teardownDOM();
    // Initialize the namespace
    window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};
    // Load the module
    require('../../../src/services/recently-visited-parser');
    
    // Save original MutationObserver
    originalMutationObserver = global.MutationObserver;
  });

  afterEach(() => {
    teardownDOM();
    // Restore original MutationObserver
    global.MutationObserver = originalMutationObserver;
  });

  describe('waitForRecentlyVisitedWidget', () => {
    it('should resolve immediately when widget is already loaded', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="listItem-abc">Item 1</div>
            <div class="listItem-def">Item 2</div>
            <div class="listItem-ghi">Item 3</div>
          </div>
        </div>
      `;
      setupDOM(html);

      const result = await window.AWSFavoritesQuickbar.waitForRecentlyVisitedWidget(1000);
      expect(result).toBe(true);
    });

    it('should wait for widget to appear via MutationObserver', async () => {
      setupDOM('<div id="container"></div>');

      // Create a mock MutationObserver that we can trigger
      const MockObserver = mockMutationObserver();
      global.MutationObserver = MockObserver;

      // Start waiting
      const promise = window.AWSFavoritesQuickbar.waitForRecentlyVisitedWidget(2000);

      // Simulate widget appearing after a delay
      setTimeout(() => {
        const container = document.getElementById('container');
        container.innerHTML = `
          <div data-widget-type="recently-visited">
            <div aria-label="Recently visited">
              <div class="listItem-abc">Item 1</div>
              <div class="listItem-def">Item 2</div>
              <div class="listItem-ghi">Item 3</div>
            </div>
          </div>
        `;
        
        // Trigger the observer
        MockObserver.trigger([{ type: 'childList' }]);
      }, 100);

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should timeout and return false when widget does not appear', async () => {
      setupDOM('<div></div>');

      const result = await window.AWSFavoritesQuickbar.waitForRecentlyVisitedWidget(500);
      expect(result).toBe(false);
    }, 1000);

    it('should return true if widget appears with fewer than 3 items before timeout', async () => {
      setupDOM('<div></div>');

      const MockObserver = mockMutationObserver();
      global.MutationObserver = MockObserver;

      const promise = window.AWSFavoritesQuickbar.waitForRecentlyVisitedWidget(1000);

      setTimeout(() => {
        document.body.innerHTML = `
          <div data-widget-type="recently-visited">
            <div aria-label="Recently visited">
              <div class="listItem-abc">Item 1</div>
            </div>
          </div>
        `;
        MockObserver.trigger([{ type: 'childList' }]);
      }, 100);

      const result = await promise;
      expect(result).toBe(true);
    }, 2000);
  });

  describe('parseRecentlyVisited', () => {
    it('should return empty array when widget is not present', async () => {
      setupDOM('<div></div>');

      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();
      expect(services).toEqual([]);
    });

    it('should parse services from widget with aria-label container', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="listItem-abc">
              <a href="https://s3.console.aws.amazon.com/s3/home">
                <img src="https://a0.awsstatic.com/s3/icon.png" />
                S3
              </a>
            </div>
            <div class="listItem-def">
              <a href="https://ec2.console.aws.amazon.com/ec2/home">
                <img src="https://a0.awsstatic.com/ec2/icon.png" />
                EC2
              </a>
            </div>
          </div>
        </div>
      `;
      setupDOM(html);

      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();

      expect(services.length).toBe(2);
      expect(services[0].id).toBe('s3');
      expect(services[0].name).toBe('S3');
      expect(services[1].id).toBe('ec2');
      expect(services[1].name).toBe('EC2');
    });

    it('should parse services from widget with polite region', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div data-testid="polite">
            <div aria-label="Recently visited">
              <div class="listItem-abc">
                <a href="https://lambda.console.aws.amazon.com/lambda/home">
                  <img src="https://a0.awsstatic.com/lambda/icon.png" />
                  Lambda
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
      setupDOM(html);

      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();

      expect(services.length).toBe(1);
      expect(services[0].id).toBe('lambda');
      expect(services[0].name).toBe('Lambda');
    });

    it('should handle widget without polite region gracefully', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="listItem-abc">
              <a href="https://dynamodb.console.aws.amazon.com/dynamodb/home">DynamoDB</a>
            </div>
          </div>
        </div>
      `;
      setupDOM(html);

      const services = await window.AWSFavoritesQuickbar.parseRecentlyVisited();

      expect(services.length).toBe(1);
      expect(services[0].id).toBe('dynamodb');
    });
  });

  describe('extractServicesFromContainer', () => {
    it('should extract services from container with listItem elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="listItem-abc">
          <a href="https://s3.console.aws.amazon.com/s3/home">
            <img src="https://a0.awsstatic.com/s3/icon.png" />
            S3
          </a>
        </div>
        <div class="listItem-def">
          <a href="https://ec2.console.aws.amazon.com/ec2/home">
            <img src="https://a0.awsstatic.com/ec2/icon.png" />
            EC2
          </a>
        </div>
      `;

      const services = window.AWSFavoritesQuickbar.extractServicesFromContainer(container);

      expect(services.length).toBe(2);
      expect(services[0].id).toBe('s3');
      expect(services[0].iconUrl).toBe('https://a0.awsstatic.com/s3/icon.png');
      expect(services[1].id).toBe('ec2');
      expect(services[1].iconUrl).toBe('https://a0.awsstatic.com/ec2/icon.png');
    });

    it('should extract services from container with direct links when no listItem elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <a href="https://lambda.console.aws.amazon.com/lambda/home">Lambda</a>
        <a href="https://dynamodb.console.aws.amazon.com/dynamodb/home">DynamoDB</a>
      `;

      const services = window.AWSFavoritesQuickbar.extractServicesFromContainer(container);

      expect(services.length).toBe(2);
      expect(services[0].id).toBe('lambda');
      expect(services[1].id).toBe('dynamodb');
    });

    it('should handle container with no links', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div>No links here</div>';

      const services = window.AWSFavoritesQuickbar.extractServicesFromContainer(container);

      expect(services).toEqual([]);
    });

    it('should skip items without links', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="listItem-abc">
          <a href="https://s3.console.aws.amazon.com/s3/home">S3</a>
        </div>
        <div class="listItem-def">
          <span>Not a link</span>
        </div>
        <div class="listItem-ghi">
          <a href="https://ec2.console.aws.amazon.com/ec2/home">EC2</a>
        </div>
      `;

      const services = window.AWSFavoritesQuickbar.extractServicesFromContainer(container);

      expect(services.length).toBe(2);
      expect(services[0].id).toBe('s3');
      expect(services[1].id).toBe('ec2');
    });
  });

  describe('extractServiceFromLink', () => {
    it('should extract service from link with subdomain service ID', () => {
      const link = document.createElement('a');
      link.href = 'https://s3.console.aws.amazon.com/s3/home';
      link.textContent = 'S3';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);

      expect(service).toBeDefined();
      expect(service.id).toBe('s3');
      expect(service.name).toBe('S3');
      expect(service.consoleUrl).toBe('https://s3.console.aws.amazon.com/s3/home');
      expect(service.source).toBe('recent');
    });

    it('should extract service from link with pathname service ID', () => {
      const link = document.createElement('a');
      link.href = 'https://us-east-1.console.aws.amazon.com/dynamodb/home';
      link.textContent = 'DynamoDB';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);

      expect(service).toBeDefined();
      expect(service.id).toBe('dynamodb');
      expect(service.name).toBe('DynamoDB');
    });

    it('should extract icon URL from link image', () => {
      const link = document.createElement('a');
      link.href = 'https://lambda.console.aws.amazon.com/lambda/home';
      link.innerHTML = '<img src="https://a0.awsstatic.com/lambda/icon.png" />Lambda';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);

      expect(service.iconUrl).toBe('https://a0.awsstatic.com/lambda/icon.png');
    });

    it('should use provided iconUrl parameter', () => {
      const link = document.createElement('a');
      link.href = 'https://s3.console.aws.amazon.com/s3/home';
      link.textContent = 'S3';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link, 'https://custom.com/icon.png');

      expect(service.iconUrl).toBe('https://custom.com/icon.png');
    });

    it('should handle relative URLs by converting to absolute', () => {
      const link = document.createElement('a');
      link.href = '/s3/home';
      link.textContent = 'S3';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);

      expect(service).toBeDefined();
      expect(service.id).toBe('s3');
      // Relative URLs get converted to absolute based on current location
      expect(service.consoleUrl).toContain('/s3/home');
    });

    it('should return null for invalid URLs', () => {
      const link = document.createElement('a');
      link.href = '';
      link.textContent = 'Invalid';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);

      expect(service).toBeNull();
    });

    it('should extract service ID from pathname even for non-AWS domains', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com/page';
      link.textContent = 'Not AWS';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);

      // The function extracts service ID from pathname regardless of domain
      expect(service).toBeDefined();
      expect(service.id).toBe('page');
    });

    it('should handle links without text content', () => {
      const link = document.createElement('a');
      link.href = 'https://s3.console.aws.amazon.com/s3/home';

      const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);

      expect(service).toBeDefined();
      expect(service.name).toBe('s3');
    });
  });
});
