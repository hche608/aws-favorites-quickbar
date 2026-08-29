/**
 * Unit tests for icon-extractor.ts
 * Tests icon extraction from AWS Console DOM
 */

import { setupDOM, teardownDOM } from '../../helpers/dom-helpers';

// Try dynamic import
let extractIconUrlsFromConsole: () => Promise<Record<string, string>>;

beforeAll(async () => {
  const module = await import('../../../src/services/icon-extractor');
  extractIconUrlsFromConsole = module.extractIconUrlsFromConsole;
});

describe('icon-extractor', () => {
  beforeEach(() => {
    teardownDOM();
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('extractIconUrlsFromConsole', () => {
    it('should be a function', () => {
      expect(typeof extractIconUrlsFromConsole).toBe('function');
    });

    it('should extract icons from subdomain-based service links', async () => {
      setupDOM(`
        <a href="https://ec2.console.aws.amazon.com/ec2/home">
          <img src="https://a0.awsstatic.com/icons/ec2.png" />
        </a>
        <a href="https://s3.console.aws.amazon.com/s3/home">
          <img src="https://a0.awsstatic.com/icons/s3.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result).toEqual({
        ec2: 'https://a0.awsstatic.com/icons/ec2.png',
        s3: 'https://a0.awsstatic.com/icons/s3.png'
      });
    });

    it('should extract icons from path-based URLs when subdomain is not a service', async () => {
      setupDOM(`
        <a href="https://console.aws.amazon.com/lambda/home">
          <img src="https://a0.awsstatic.com/icons/lambda.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result['lambda']).toBe('https://a0.awsstatic.com/icons/lambda.png');
    });

    it('should skip region subdomains and use path fallback', async () => {
      setupDOM(`
        <a href="https://us-east-1.console.aws.amazon.com/dynamodb/home">
          <img src="https://a0.awsstatic.com/icons/dynamodb.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result['us-east-1']).toBeUndefined();
      expect(result['dynamodb']).toBe('https://a0.awsstatic.com/icons/dynamodb.png');
    });

    it('should skip links without images', async () => {
      setupDOM(`
        <a href="https://ec2.console.aws.amazon.com/ec2/home">
          <span>EC2</span>
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result).toEqual({});
    });

    it('should skip links with images that do not have awsstatic.com src', async () => {
      setupDOM(`
        <a href="https://ec2.console.aws.amazon.com/ec2/home">
          <img src="https://example.com/icon.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result).toEqual({});
    });

    it('should skip images without src attribute', async () => {
      setupDOM(`
        <a href="https://ec2.console.aws.amazon.com/ec2/home">
          <img alt="EC2" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result).toEqual({});
    });

    it('should return empty map when no console links found', async () => {
      setupDOM(`<div>No AWS links here</div>`);

      const result = await extractIconUrlsFromConsole();

      expect(result).toEqual({});
    });

    it('should normalize service IDs to lowercase', async () => {
      setupDOM(`
        <a href="https://EC2.console.aws.amazon.com/ec2/home">
          <img src="https://a0.awsstatic.com/icons/ec2.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result['ec2']).toBe('https://a0.awsstatic.com/icons/ec2.png');
      expect(result['EC2']).toBeUndefined();
    });

    it('should handle multiple services with mixed URL formats', async () => {
      setupDOM(`
        <a href="https://ec2.console.aws.amazon.com/ec2/home">
          <img src="https://a0.awsstatic.com/icons/ec2.png" />
        </a>
        <a href="https://console.aws.amazon.com/lambda/home">
          <img src="https://a0.awsstatic.com/icons/lambda.png" />
        </a>
        <a href="https://us-west-2.console.aws.amazon.com/rds/home">
          <img src="https://a0.awsstatic.com/icons/rds.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result['ec2']).toBe('https://a0.awsstatic.com/icons/ec2.png');
      expect(result['lambda']).toBe('https://a0.awsstatic.com/icons/lambda.png');
      expect(result['rds']).toBe('https://a0.awsstatic.com/icons/rds.png');
      expect(result['us-west-2']).toBeUndefined();
    });

    it('should handle malformed URLs gracefully', async () => {
      setupDOM(`
        <a href="not-a-valid-url">
          <img src="https://a0.awsstatic.com/icons/ec2.png" />
        </a>
        <a href="https://ec2.console.aws.amazon.com/ec2/home">
          <img src="https://a0.awsstatic.com/icons/ec2.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      // Should skip the malformed URL but process the valid one
      expect(result['ec2']).toBe('https://a0.awsstatic.com/icons/ec2.png');
    });

    it('should handle links with no path match', async () => {
      setupDOM(`
        <a href="https://console.aws.amazon.com/">
          <img src="https://a0.awsstatic.com/icons/console.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      // Should not extract anything since there's no valid service ID
      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle DOM query errors gracefully', async () => {
      // Mock querySelectorAll to throw an error
      const originalQuerySelectorAll = document.querySelectorAll;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      document.querySelectorAll = jest.fn(() => {
        throw new Error('DOM error');
      });

      const result = await extractIconUrlsFromConsole();

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'AWS Favorites Quickbar: Error extracting icons',
        expect.any(Error)
      );

      // Restore
      document.querySelectorAll = originalQuerySelectorAll;
      consoleWarnSpy.mockRestore();
    });

    it('should handle empty href attribute', async () => {
      setupDOM(`
        <a href="">
          <img src="https://a0.awsstatic.com/icons/ec2.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result).toEqual({});
    });

    it('should extract service from complex paths', async () => {
      setupDOM(`
        <a href="https://console.aws.amazon.com/cloudwatch/home?region=us-east-1">
          <img src="https://a0.awsstatic.com/icons/cloudwatch.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result['cloudwatch']).toBe('https://a0.awsstatic.com/icons/cloudwatch.png');
    });

    it('should handle duplicate service IDs by keeping the last one', async () => {
      setupDOM(`
        <a href="https://ec2.console.aws.amazon.com/ec2/home">
          <img src="https://a0.awsstatic.com/icons/ec2-old.png" />
        </a>
        <a href="https://ec2.console.aws.amazon.com/ec2/home?region=us-west-2">
          <img src="https://a0.awsstatic.com/icons/ec2-new.png" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result['ec2']).toBe('https://a0.awsstatic.com/icons/ec2-new.png');
    });

    it('should extract CodeBuild and CodePipeline icons independently without collision', async () => {
      setupDOM(`
        <a href="https://ap-southeast-2.console.aws.amazon.com/codesuite/codebuild/home?region=ap-southeast-2">
          <img src="https://a.b.cdn.console.awsstatic.com/icons/codebuild.svg" />
        </a>
        <a href="https://ap-southeast-2.console.aws.amazon.com/codesuite/codepipeline/home?region=ap-southeast-2">
          <img src="https://a.b.cdn.console.awsstatic.com/icons/codepipeline.svg" />
        </a>
      `);

      const result = await extractIconUrlsFromConsole();

      expect(result['codebuild']).toBe('https://a.b.cdn.console.awsstatic.com/icons/codebuild.svg');
      expect(result['codepipeline']).toBe(
        'https://a.b.cdn.console.awsstatic.com/icons/codepipeline.svg'
      );
      expect(result['codesuite']).toBeUndefined();
    });
  });
});
