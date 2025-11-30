/**
 * Unit tests for region detection (src/utils/region.js)
 * Requirements: 1.3
 */

const { mockLocalStorage } = require('../../helpers/mocks');

describe('Region Detection', () => {
  let originalLocation;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Store original location
    originalLocation = window.location;
    
    // Initialize the namespace
    window.AWSFavoritesQuickbar = {};
    
    // Load the module fresh
    jest.resetModules();
    require('../../../src/utils/region');
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
    localStorage.clear();
    jest.clearAllMocks();
    delete window.AWSFavoritesQuickbar;
  });

  describe('detectRegion', () => {
    it('should detect region from URL parameter', () => {
      delete window.location;
      window.location = {
        search: '?region=us-west-2'
      };

      const result = window.AWSFavoritesQuickbar.detectRegion();

      expect(result).toBe('us-west-2');
    });

    it('should detect region from URL parameter with multiple params', () => {
      delete window.location;
      window.location = {
        search: '?service=s3&region=eu-west-1&tab=buckets'
      };

      const result = window.AWSFavoritesQuickbar.detectRegion();

      expect(result).toBe('eu-west-1');
    });

    it('should detect region from localStorage when URL param is missing', () => {
      delete window.location;
      window.location = {
        search: ''
      };

      localStorage.setItem('awsc-region', 'ap-southeast-1');

      const result = window.AWSFavoritesQuickbar.detectRegion();

      expect(result).toBe('ap-southeast-1');
    });

    it('should fallback to default region when both URL and localStorage are empty', () => {
      delete window.location;
      window.location = {
        search: ''
      };

      const result = window.AWSFavoritesQuickbar.detectRegion();

      expect(result).toBe('us-east-1');
    });

    it('should prioritize URL parameter over localStorage', () => {
      delete window.location;
      window.location = {
        search: '?region=us-west-1'
      };

      localStorage.setItem('awsc-region', 'eu-central-1');

      const result = window.AWSFavoritesQuickbar.detectRegion();

      expect(result).toBe('us-west-1');
    });

    it('should handle URL parsing errors gracefully', () => {
      delete window.location;
      window.location = {
        get search() {
          throw new Error('URL parsing error');
        }
      };

      localStorage.setItem('awsc-region', 'us-east-2');

      const result = window.AWSFavoritesQuickbar.detectRegion();

      // Should fall back to localStorage
      expect(result).toBe('us-east-2');
    });

    it('should handle localStorage errors gracefully', () => {
      delete window.location;
      window.location = {
        search: ''
      };

      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      const result = window.AWSFavoritesQuickbar.detectRegion();

      // Should fall back to default region
      expect(result).toBe('us-east-1');

      // Restore
      localStorage.getItem = originalGetItem;
    });

    it('should handle empty region parameter in URL', () => {
      delete window.location;
      window.location = {
        search: '?region='
      };

      localStorage.setItem('awsc-region', 'ap-northeast-1');

      const result = window.AWSFavoritesQuickbar.detectRegion();

      // Empty string is falsy, should fall back to localStorage
      expect(result).toBe('ap-northeast-1');
    });

    it('should detect various AWS region formats', () => {
      const regions = [
        'us-east-1',
        'us-west-2',
        'eu-west-1',
        'ap-southeast-2',
        'ca-central-1',
        'sa-east-1'
      ];

      regions.forEach(region => {
        delete window.location;
        window.location = {
          search: `?region=${region}`
        };

        const result = window.AWSFavoritesQuickbar.detectRegion();
        expect(result).toBe(region);
      });
    });

    it('should handle malformed URL search strings', () => {
      delete window.location;
      window.location = {
        search: 'not-a-valid-query-string'
      };

      localStorage.setItem('awsc-region', 'us-west-1');

      const result = window.AWSFavoritesQuickbar.detectRegion();

      // Should fall back to localStorage
      expect(result).toBe('us-west-1');
    });
  });
});
