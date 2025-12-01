/**
 * Unit tests for service-merger.ts
 * Tests service merging with property-based testing
 */

import * as fc from 'fast-check';
import { mergeServices } from '../../../src/services/service-merger';
import { Service } from '../../../src/types';

describe('service-merger', () => {
  describe('mergeServices', () => {
    it('should merge user favorites and recent services', () => {
      const userFavorites: Service[] = [
        { id: 'dynamodb', name: 'DynamoDB', iconUrl: 'icon1.png', consoleUrl: 'url1' },
        { id: 'rds', name: 'RDS', iconUrl: 'icon2.png', consoleUrl: 'url2' }
      ];
      const recentServices: Service[] = [
        { id: 's3', name: 'S3', iconUrl: 'icon3.png', consoleUrl: 'url3' },
        { id: 'ec2', name: 'EC2', iconUrl: 'icon4.png', consoleUrl: 'url4' }
      ];

      const merged = mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(4);
      expect(merged[0].id).toBe('dynamodb');
      expect(merged[1].id).toBe('rds');
      expect(merged[2].id).toBe('s3');
      expect(merged[3].id).toBe('ec2');
    });

    it('should remove duplicates from recent services', () => {
      const userFavorites: Service[] = [
        { id: 's3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1' }
      ];
      const recentServices: Service[] = [
        { id: 's3', name: 'S3', iconUrl: 'icon2.png', consoleUrl: 'url2' },
        { id: 'ec2', name: 'EC2', iconUrl: 'icon3.png', consoleUrl: 'url3' }
      ];

      const merged = mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(2);
      expect(merged[0].id).toBe('s3');
      expect(merged[0].iconUrl).toBe('icon1.png'); // User favorite version
      expect(merged[1].id).toBe('ec2');
    });

    it('should handle case-insensitive duplicate detection', () => {
      const userFavorites: Service[] = [
        { id: 'S3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1' }
      ];
      const recentServices: Service[] = [
        { id: 's3', name: 'S3', iconUrl: 'icon2.png', consoleUrl: 'url2' },
        { id: 'EC2', name: 'EC2', iconUrl: 'icon3.png', consoleUrl: 'url3' }
      ];

      const merged = mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(2);
      expect(merged[0].id).toBe('S3');
      expect(merged[1].id).toBe('EC2');
    });

    it('should handle empty user favorites', () => {
      const userFavorites: Service[] = [];
      const recentServices: Service[] = [
        { id: 's3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1' }
      ];

      const merged = mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe('s3');
    });

    it('should handle empty recent services', () => {
      const userFavorites: Service[] = [
        { id: 's3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1' }
      ];
      const recentServices: Service[] = [];

      const merged = mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe('s3');
    });

    it('should handle both arrays empty', () => {
      const merged = mergeServices([], []);

      expect(merged).toEqual([]);
    });

    /**
     * Property 2: Service merging deduplication
     * Feature: test-coverage, Property 2: Service merging deduplication
     * Validates: Requirements 2.4
     */
    describe('Property 2: Service merging deduplication', () => {
      // Create an arbitrary for service objects
      const serviceArbitrary = fc.record({
        id: fc.stringOf(
          fc.char().filter((c) => /[a-z0-9-]/.test(c)),
          { minLength: 2, maxLength: 20 }
        ),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.webUrl(),
        consoleUrl: fc.webUrl()
      });

      it('should return array with no duplicate service IDs (case-insensitive)', () => {
        fc.assert(
          fc.property(
            fc.array(serviceArbitrary),
            fc.array(serviceArbitrary),
            (userFavorites: Service[], recentServices: Service[]) => {
              const merged = mergeServices(userFavorites, recentServices);

              // Extract IDs in lowercase
              const ids = merged.map((s) => s.id.toLowerCase());
              const uniqueIds = new Set(ids);

              // Should have no duplicates
              expect(ids.length).toBe(uniqueIds.size);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should prefer user favorites over recent services for duplicates', () => {
        fc.assert(
          fc.property(
            fc.array(serviceArbitrary),
            fc.array(serviceArbitrary),
            (userFavorites: Service[], recentServices: Service[]) => {
              const merged = mergeServices(userFavorites, recentServices);

              // For each service in merged, if it appears in userFavorites, it should be the user version
              const userIds = new Set(userFavorites.map((s) => s.id.toLowerCase()));

              merged.forEach((service) => {
                if (userIds.has(service.id.toLowerCase())) {
                  // Find the original user favorite
                  const userFav = userFavorites.find(
                    (u) => u.id.toLowerCase() === service.id.toLowerCase()
                  );
                  if (userFav) {
                    expect(service).toEqual(userFav);
                  }
                }
              });
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Property 3: Service merging order preservation
     * Feature: test-coverage, Property 3: Service merging order preservation
     * Validates: Requirements 2.4
     */
    describe('Property 3: Service merging order preservation', () => {
      const serviceArbitrary = fc.record({
        id: fc.stringOf(
          fc.char().filter((c) => /[a-z0-9-]/.test(c)),
          { minLength: 2, maxLength: 20 }
        ),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.webUrl(),
        consoleUrl: fc.webUrl()
      });

      it('should place all user favorites before recent services', () => {
        fc.assert(
          fc.property(
            fc.array(serviceArbitrary, { minLength: 1 }),
            fc.array(serviceArbitrary, { minLength: 1 }),
            (userFavorites: Service[], recentServices: Service[]) => {
              const merged = mergeServices(userFavorites, recentServices);

              // Find the index of the last user favorite
              let lastUserIndex = -1;
              let firstRecentIndex = merged.length;

              merged.forEach((service, index) => {
                const isUserFavorite = userFavorites.some(
                  (u) => u.id.toLowerCase() === service.id.toLowerCase()
                );
                if (isUserFavorite) {
                  lastUserIndex = Math.max(lastUserIndex, index);
                } else {
                  firstRecentIndex = Math.min(firstRecentIndex, index);
                }
              });

              // All user favorites should come before all recent services
              if (lastUserIndex >= 0 && firstRecentIndex < merged.length) {
                expect(lastUserIndex).toBeLessThan(firstRecentIndex);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should preserve order within user favorites', () => {
        fc.assert(
          fc.property(
            fc.array(serviceArbitrary, { minLength: 2 }).filter((arr) => {
              // Ensure no duplicate IDs within the array
              const ids = arr.map((s) => s.id.toLowerCase());
              return ids.length === new Set(ids).size;
            }),
            fc.array(serviceArbitrary),
            (userFavorites: Service[], recentServices: Service[]) => {
              // Skip if userFavorites is empty after filtering
              if (userFavorites.length < 2) return;

              const merged = mergeServices(userFavorites, recentServices);

              // Extract user favorites from merged result
              const mergedUserFavorites = merged.filter((service) =>
                userFavorites.some((u) => u.id.toLowerCase() === service.id.toLowerCase())
              );

              // Check that the order is preserved
              for (let i = 0; i < mergedUserFavorites.length - 1; i++) {
                const currentIndex = userFavorites.findIndex(
                  (u) => u.id.toLowerCase() === mergedUserFavorites[i].id.toLowerCase()
                );
                const nextIndex = userFavorites.findIndex(
                  (u) => u.id.toLowerCase() === mergedUserFavorites[i + 1].id.toLowerCase()
                );

                if (currentIndex >= 0 && nextIndex >= 0) {
                  expect(currentIndex).toBeLessThan(nextIndex);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should preserve order within recent services (excluding duplicates)', () => {
        fc.assert(
          fc.property(
            fc.array(serviceArbitrary),
            fc.array(serviceArbitrary, { minLength: 2 }).filter((arr) => {
              // Ensure no duplicate IDs within the array
              const ids = arr.map((s) => s.id.toLowerCase());
              return ids.length === new Set(ids).size;
            }),
            (userFavorites: Service[], recentServices: Service[]) => {
              // Skip if recentServices is empty after filtering
              if (recentServices.length < 2) return;

              const merged = mergeServices(userFavorites, recentServices);

              // Extract recent services from merged result (those not in user favorites)
              const userIds = new Set(userFavorites.map((u) => u.id.toLowerCase()));
              const mergedRecentServices = merged.filter(
                (service) => !userIds.has(service.id.toLowerCase())
              );

              // Check that the order is preserved
              for (let i = 0; i < mergedRecentServices.length - 1; i++) {
                const currentIndex = recentServices.findIndex(
                  (r) => r.id.toLowerCase() === mergedRecentServices[i].id.toLowerCase()
                );
                const nextIndex = recentServices.findIndex(
                  (r) => r.id.toLowerCase() === mergedRecentServices[i + 1].id.toLowerCase()
                );

                if (currentIndex >= 0 && nextIndex >= 0) {
                  expect(currentIndex).toBeLessThan(nextIndex);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
