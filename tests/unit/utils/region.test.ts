/**
 * Unit tests for region detection (src/utils/region.ts)
 * Requirements: 1.3
 */

import { detectRegion } from '../../../src/utils/region';

describe('Region Detection', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Helper to mock location.search
  // In Jest 30 / newer jsdom, window.location is fully locked down.
  // We mock the global URLSearchParams to control what detectRegion reads.
  const mockLocation = (search: string, throwOnAccess = false) => {
    if (throwOnAccess) {
      jest.spyOn(global, 'URLSearchParams').mockImplementation(() => {
        throw new Error('URL parsing error');
      });
    } else {
      jest.spyOn(global, 'URLSearchParams').mockImplementation(() => {
        const params = new Map<string, string>();
        const stripped = search.startsWith('?') ? search.slice(1) : search;
        if (stripped) {
          stripped.split('&').forEach((pair) => {
            const [key, value] = pair.split('=');
            if (key && value !== undefined) {
              params.set(key, value);
            }
          });
        }
        return {
          get: (key: string) => params.get(key) ?? null,
          has: (key: string) => params.has(key)
        } as any;
      });
    }
  };

  describe('detectRegion', () => {
    it('should detect region from URL parameter', () => {
      mockLocation('?region=us-west-2');

      const result = detectRegion();

      expect(result).toBe('us-west-2');
    });

    it('should detect region from URL parameter with multiple params', () => {
      mockLocation('?service=s3&region=eu-west-1&tab=buckets');

      const result = detectRegion();

      expect(result).toBe('eu-west-1');
    });

    it('should detect region from localStorage when URL param is missing', () => {
      mockLocation('');
      localStorage.setItem('awsc-region', 'ap-southeast-1');

      const result = detectRegion();

      expect(result).toBe('ap-southeast-1');
    });

    it('should fallback to default region when both URL and localStorage are empty', () => {
      mockLocation('');

      const result = detectRegion();

      expect(result).toBe('us-east-1');
    });

    it('should prioritize URL parameter over localStorage', () => {
      mockLocation('?region=us-west-1');
      localStorage.setItem('awsc-region', 'eu-central-1');

      const result = detectRegion();

      expect(result).toBe('us-west-1');
    });

    it('should handle URL parsing errors gracefully', () => {
      mockLocation('', true);
      localStorage.setItem('awsc-region', 'us-east-2');

      const result = detectRegion();

      // Should fall back to localStorage
      expect(result).toBe('us-east-2');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocation('');

      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      const result = detectRegion();

      // Should fall back to default region
      expect(result).toBe('us-east-1');

      // Restore
      localStorage.getItem = originalGetItem;
    });

    it('should handle empty region parameter in URL', () => {
      mockLocation('?region=');
      localStorage.setItem('awsc-region', 'ap-northeast-1');

      const result = detectRegion();

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

      regions.forEach((region) => {
        mockLocation(`?region=${region}`);
        const result = detectRegion();
        expect(result).toBe(region);
      });
    });

    it('should handle malformed URL search strings', () => {
      mockLocation('not-a-valid-query-string');
      localStorage.setItem('awsc-region', 'us-west-1');

      const result = detectRegion();

      // Should fall back to localStorage
      expect(result).toBe('us-west-1');
    });
  });
});
