/**
 * Unit tests for icon-validator.ts
 * Tests icon URL validation with property-based testing
 */

import * as fc from 'fast-check';
import { isValidIconUrl, updateServiceIcons } from '../../../src/services/icon-validator';
import { Service } from '../../../src/types';

describe('icon-validator', () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    // Save original Image constructor
    originalImage = global.Image;
  });

  afterEach(() => {
    // Restore original Image
    global.Image = originalImage;
  });

  describe('isValidIconUrl', () => {
    it('should return false for null or undefined', async () => {
      expect(await isValidIconUrl(null)).toBe(false);
      expect(await isValidIconUrl(undefined)).toBe(false);
    });

    it('should return false for non-string values', async () => {
      expect(await isValidIconUrl(123 as any)).toBe(false);
      expect(await isValidIconUrl({} as any)).toBe(false);
      expect(await isValidIconUrl([] as any)).toBe(false);
    });

    it('should return false for strings shorter than minimum length', async () => {
      expect(await isValidIconUrl('short')).toBe(false);
      expect(await isValidIconUrl('https://a.com')).toBe(false);
    });

    it('should return true for valid data URIs', async () => {
      const dataUri =
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>';
      expect(await isValidIconUrl(dataUri)).toBe(true);
    });

    it('should return false for short data URIs', async () => {
      const shortDataUri = 'data:image/svg+xml,<svg></svg>';
      expect(await isValidIconUrl(shortDataUri)).toBe(false);
    });

    it('should validate HTTPS URLs by loading them', async () => {
      // Mock Image to simulate successful load
      global.Image = jest.fn(function (this: HTMLImageElement) {
        this.src = '';
        this.width = 100;
        this.height = 100;

        setTimeout(() => {
          if (this.onload) {
            this.onload(new Event('load'));
          }
        }, 0);
        return this;
      }) as any;

      const url = 'https://example.com/icon.png';
      const result = await isValidIconUrl(url);
      expect(result).toBe(true);
    });

    it('should return false for HTTPS URLs that fail to load', async () => {
      // Mock Image to simulate failed load
      global.Image = jest.fn(function (this: HTMLImageElement) {
        this.src = '';

        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event('error'));
          }
        }, 0);
        return this;
      }) as any;

      const url = 'https://example.com/nonexistent.png';
      const result = await isValidIconUrl(url);
      expect(result).toBe(false);
    });

    it('should return false for non-HTTPS URLs', async () => {
      expect(await isValidIconUrl('http://example.com/icon.png')).toBe(false);
      expect(await isValidIconUrl('ftp://example.com/icon.png')).toBe(false);
    });

    it('should handle timeout for slow-loading images', async () => {
      // Mock Image that never loads
      global.Image = jest.fn(function (this: HTMLImageElement) {
        this.src = '';
        // Never call onload or onerror
        return this;
      }) as any;

      const url = 'https://example.com/slow-icon.png';
      const result = await isValidIconUrl(url);
      expect(result).toBe(false);
    }, 5000);

    /**
     * Property 1: Icon URL validation consistency
     * Feature: test-coverage, Property 1: Icon URL validation consistency
     * Validates: Requirements 2.2
     */
    describe('Property 1: Icon URL validation consistency', () => {
      beforeEach(() => {
        // Mock Image for property tests to avoid timeouts
        global.Image = jest.fn(function (this: HTMLImageElement) {
          this.src = '';
          this.width = 100;
          this.height = 100;

          setTimeout(() => {
            if (this.onload) {
              this.onload(new Event('load'));
            }
          }, 0);
          return this;
        }) as any;
      });

      it('should never throw an exception for any string input', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(
              fc.string(),
              fc.webUrl({ validSchemes: ['https'] }),
              fc.constant(
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
              ),
              fc.constant(null),
              fc.constant(undefined),
              fc.integer(),
              fc.object()
            ),
            async (input: any) => {
              // Should never throw
              let threw = false;
              let result: boolean | undefined;
              try {
                result = await isValidIconUrl(input);
              } catch (error) {
                threw = true;
              }

              expect(threw).toBe(false);

              // Should always return a boolean
              if (typeof input === 'string') {
                expect(typeof result).toBe('boolean');
              } else {
                expect(result).toBe(false);
              }
            }
          ),
          { numRuns: 100 }
        );
      }, 10000);

      it('should return true only for valid data URIs or loadable HTTPS URLs', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(
              // Valid data URIs (long enough)
              fc.constant(
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
              ),
              // Valid HTTPS URLs (long enough)
              fc.webUrl({ validSchemes: ['https'] }).filter((url) => url.length >= 20),
              // Invalid: short strings
              fc.string({ maxLength: 19 }),
              // Invalid: non-HTTPS URLs
              fc.webUrl({ validSchemes: ['http', 'ftp'] }),
              // Invalid: random strings
              fc
                .string({ minLength: 20, maxLength: 50 })
                .filter((s) => !s.startsWith('https://') && !s.startsWith('data:image/'))
            ),
            async (url: string) => {
              const result = await isValidIconUrl(url);

              // Result should always be a boolean
              expect(typeof result).toBe('boolean');

              // If it returns true, it must be either a valid data URI or HTTPS URL
              if (result === true) {
                expect(
                  (typeof url === 'string' && url.startsWith('data:image/') && url.length > 50) ||
                    (typeof url === 'string' && url.startsWith('https://') && url.length >= 20)
                ).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      }, 10000);
    });
  });

  describe('updateServiceIcons', () => {
    beforeEach(() => {
      // Mock Image for successful loads
      global.Image = jest.fn(function (this: HTMLImageElement) {
        this.src = '';
        this.width = 100;
        this.height = 100;

        setTimeout(() => {
          if (this.onload) {
            this.onload(new Event('load'));
          }
        }, 0);
        return this;
      }) as any;
    });

    it('should update service icons when valid new icons are available', async () => {
      const services: Service[] = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://old.com/s3.png',
          consoleUrl: 'https://console.aws.amazon.com/s3'
        }
      ];
      const iconMap: Record<string, string> = {
        s3: 'https://new.awsstatic.com/s3-icon.png'
      };

      const updated = await updateServiceIcons(services, iconMap);

      expect(updated[0].iconUrl).toBe('https://new.awsstatic.com/s3-icon.png');
    });

    it('should not update icons when new icon is invalid', async () => {
      // Mock Image to fail
      global.Image = jest.fn(function (this: HTMLImageElement) {
        this.src = '';

        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event('error'));
          }
        }, 0);
        return this;
      }) as any;

      const services: Service[] = [
        {
          id: 's3',
          name: 'S3',
          iconUrl: 'https://old.com/s3.png',
          consoleUrl: 'https://console.aws.amazon.com/s3'
        }
      ];
      const iconMap: Record<string, string> = {
        s3: 'https://invalid.com/icon.png'
      };

      const updated = await updateServiceIcons(services, iconMap);

      expect(updated[0].iconUrl).toBe('https://old.com/s3.png');
    });

    it('should handle case-insensitive service ID matching', async () => {
      const services: Service[] = [
        {
          id: 'S3',
          name: 'S3',
          iconUrl: 'https://old.com/s3.png',
          consoleUrl: 'https://console.aws.amazon.com/s3'
        }
      ];
      const iconMap: Record<string, string> = {
        s3: 'https://new.awsstatic.com/s3-icon.png'
      };

      const updated = await updateServiceIcons(services, iconMap);

      expect(updated[0].iconUrl).toBe('https://new.awsstatic.com/s3-icon.png');
    });
  });
});
