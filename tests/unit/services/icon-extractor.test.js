/**
 * Unit tests for icon-extractor.js
 * Tests icon extraction from AWS Console DOM
 */

const { setupDOM, teardownDOM, createMockElement } = require('../../helpers/dom-helpers');

describe('icon-extractor', () => {
  beforeEach(() => {
    teardownDOM();
    // Initialize the namespace
    window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};
    // Load the module
    require('../../../src/services/icon-extractor');
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('extractIconUrlsFromConsole', () => {
    it('should extract icon URLs from links with AWS service URLs', async () => {
      // Create DOM with AWS service links
      const html = `
        <div>
          <a href="https://s3.console.aws.amazon.com/s3/home">
            <img src="https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png" />
          </a>
          <a href="https://ec2.console.aws.amazon.com/ec2/home">
            <img src="https://a0.awsstatic.com/console/ec2/icon.png" />
          </a>
        </div>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap).toBeDefined();
      expect(iconMap.s3).toBe('https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png');
      expect(iconMap.ec2).toBe('https://a0.awsstatic.com/console/ec2/icon.png');
    });

    it('should extract service ID from subdomain', async () => {
      const html = `
        <a href="https://lambda.console.aws.amazon.com/lambda/home">
          <img src="https://a0.awsstatic.com/lambda/icon.png" />
        </a>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap.lambda).toBe('https://a0.awsstatic.com/lambda/icon.png');
    });

    it('should extract service ID from pathname when subdomain is a region', async () => {
      const html = `
        <a href="https://us-east-1.console.aws.amazon.com/dynamodb/home">
          <img src="https://a0.awsstatic.com/dynamodb/icon.png" />
        </a>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap.dynamodb).toBe('https://a0.awsstatic.com/dynamodb/icon.png');
    });

    it('should handle links without images gracefully', async () => {
      const html = `
        <a href="https://s3.console.aws.amazon.com/s3/home">
          S3 Service
        </a>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap).toBeDefined();
      expect(iconMap.s3).toBeUndefined();
    });

    it('should handle malformed image elements', async () => {
      const html = `
        <a href="https://s3.console.aws.amazon.com/s3/home">
          <img />
        </a>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap).toBeDefined();
      expect(iconMap.s3).toBeUndefined();
    });

    it('should handle images without awsstatic.com in src', async () => {
      const html = `
        <a href="https://s3.console.aws.amazon.com/s3/home">
          <img src="https://example.com/icon.png" />
        </a>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap).toBeDefined();
      expect(iconMap.s3).toBeUndefined();
    });

    it('should handle empty DOM', async () => {
      setupDOM('<div></div>');

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap).toBeDefined();
      expect(Object.keys(iconMap).length).toBe(0);
    });

    it('should handle multiple services and return all icons', async () => {
      const html = `
        <div>
          <a href="https://s3.console.aws.amazon.com/s3/home">
            <img src="https://a0.awsstatic.com/s3/icon.png" />
          </a>
          <a href="https://ec2.console.aws.amazon.com/ec2/home">
            <img src="https://a0.awsstatic.com/ec2/icon.png" />
          </a>
          <a href="https://lambda.console.aws.amazon.com/lambda/home">
            <img src="https://a0.awsstatic.com/lambda/icon.png" />
          </a>
        </div>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(Object.keys(iconMap).length).toBe(3);
      expect(iconMap.s3).toBeDefined();
      expect(iconMap.ec2).toBeDefined();
      expect(iconMap.lambda).toBeDefined();
    });

    it('should normalize service IDs to lowercase', async () => {
      const html = `
        <a href="https://S3.console.aws.amazon.com/s3/home">
          <img src="https://a0.awsstatic.com/s3/icon.png" />
        </a>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap.s3).toBeDefined();
      expect(iconMap.S3).toBeUndefined();
    });

    it('should handle malformed URLs gracefully', async () => {
      const html = `
        <a href="not-a-valid-url">
          <img src="https://a0.awsstatic.com/icon.png" />
        </a>
      `;
      setupDOM(html);

      const iconMap = await window.AWSFavoritesQuickbar.extractIconUrlsFromConsole();

      expect(iconMap).toBeDefined();
    });
  });
});
