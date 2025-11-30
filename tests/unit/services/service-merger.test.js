/**
 * Unit tests for service-merger.js
 * Tests service merging with property-based testing
 */

const fc = require('fast-check');

describe('service-merger', () => {
  beforeEach(() => {
    // Initialize the namespace
    window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};
    // Load the module
    require('../../../src/services/service-merger');
  });

  describe('mergeServices', () => {
    it('should merge user favorites and recent services', () => {
      const userFavorites = [
        { id: 'dynamodb', name: 'DynamoDB', iconUrl: 'icon1.png', consoleUrl: 'url1', source: 'user' },
        { id: 'rds', name: 'RDS', iconUrl: 'icon2.png', consoleUrl: 'url2', source: 'user' }
      ];
      const recentServices = [
        { id: 's3', name: 'S3', iconUrl: 'icon3.png', consoleUrl: 'url3', source: 'recent' },
        { id: 'ec2', name: 'EC2', iconUrl: 'icon4.png', consoleUrl: 'url4', source: 'recent' }
      ];

      const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(4);
      expect(merged[0].id).toBe('dynamodb');
      expect(merged[1].id).toBe('rds');
      expect(merged[2].id).toBe('s3');
      expect(merged[3].id).toBe('ec2');
    });

    it('should remove duplicates from recent services', () => {
      const userFavorites = [
        { id: 's3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1', source: 'user' }
      ];
      const recentServices = [
        { id: 's3', name: 'S3', iconUrl: 'icon2.png', consoleUrl: 'url2', source: 'recent' },
        { id: 'ec2', name: 'EC2', iconUrl: 'icon3.png', consoleUrl: 'url3', source: 'recent' }
      ];

      const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(2);
      expect(merged[0].id).toBe('s3');
      expect(merged[0].source).toBe('user');
      expect(merged[1].id).toBe('ec2');
    });

    it('should handle case-insensitive duplicate detection', () => {
      const userFavorites = [
        { id: 'S3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1', source: 'user' }
      ];
      const recentServices = [
        { id: 's3', name: 'S3', iconUrl: 'icon2.png', consoleUrl: 'url2', source: 'recent' },
        { id: 'EC2', name: 'EC2', iconUrl: 'icon3.png', consoleUrl: 'url3', source: 'recent' }
      ];

      const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(2);
      expect(merged[0].id).toBe('S3');
      expect(merged[1].id).toBe('EC2');
    });

    it('should handle empty user favorites', () => {
      const userFavorites = [];
      const recentServices = [
        { id: 's3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1', source: 'recent' }
      ];

      const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe('s3');
    });

    it('should handle empty recent services', () => {
      const userFavorites = [
        { id: 's3', name: 'S3', iconUrl: 'icon1.png', consoleUrl: 'url1', source: 'user' }
      ];
      const recentServices = [];

      const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe('s3');
    });

    it('should handle both arrays empty', () => {
      const merged = window.AWSFavoritesQuickbar.mergeServices([], []);

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
        id: fc.stringOf(fc.char().filter(c => /[a-z0-9-]/.test(c)), { minLength: 2, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.webUrl(),
        consoleUrl: fc.webUrl(),
        source: fc.constantFrom('user', 'recent')
      });

      it('should return array with no duplicate service IDs (case-insensitive)', () => {
        fc.assert(
          fc.property(
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'user' }))),
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'recent' }))),
            (userFavorites, recentServices) => {
              const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

              // Extract IDs in lowercase
              const ids = merged.map(s => s.id.toLowerCase());
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
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'user' }))),
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'recent' }))),
            (userFavorites, recentServices) => {
              const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

              // For each service in merged, if it appears in userFavorites, it should be the user version
              const userIds = new Set(userFavorites.map(s => s.id.toLowerCase()));
              
              merged.forEach(service => {
                if (userIds.has(service.id.toLowerCase())) {
                  // Find the original user favorite
                  const userFav = userFavorites.find(u => u.id.toLowerCase() === service.id.toLowerCase());
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
        id: fc.stringOf(fc.char().filter(c => /[a-z0-9-]/.test(c)), { minLength: 2, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.webUrl(),
        consoleUrl: fc.webUrl(),
        source: fc.constantFrom('user', 'recent')
      });

      it('should place all user favorites before recent services', () => {
        fc.assert(
          fc.property(
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'user' })), { minLength: 1 }),
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'recent' })), { minLength: 1 }),
            (userFavorites, recentServices) => {
              const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

              // Find the index of the last user favorite
              let lastUserIndex = -1;
              let firstRecentIndex = merged.length;

              merged.forEach((service, index) => {
                const isUserFavorite = userFavorites.some(u => u.id.toLowerCase() === service.id.toLowerCase());
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
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'user' })), { minLength: 2 })
              .filter(arr => {
                // Ensure no duplicate IDs within the array
                const ids = arr.map(s => s.id.toLowerCase());
                return ids.length === new Set(ids).size;
              }),
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'recent' }))),
            (userFavorites, recentServices) => {
              // Skip if userFavorites is empty after filtering
              if (userFavorites.length < 2) return;

              const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

              // Extract user favorites from merged result
              const mergedUserFavorites = merged.filter(service =>
                userFavorites.some(u => u.id.toLowerCase() === service.id.toLowerCase())
              );

              // Check that the order is preserved
              for (let i = 0; i < mergedUserFavorites.length - 1; i++) {
                const currentIndex = userFavorites.findIndex(u => 
                  u.id.toLowerCase() === mergedUserFavorites[i].id.toLowerCase()
                );
                const nextIndex = userFavorites.findIndex(u => 
                  u.id.toLowerCase() === mergedUserFavorites[i + 1].id.toLowerCase()
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
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'user' }))),
            fc.array(serviceArbitrary.map(s => ({ ...s, source: 'recent' })), { minLength: 2 })
              .filter(arr => {
                // Ensure no duplicate IDs within the array
                const ids = arr.map(s => s.id.toLowerCase());
                return ids.length === new Set(ids).size;
              }),
            (userFavorites, recentServices) => {
              // Skip if recentServices is empty after filtering
              if (recentServices.length < 2) return;

              const merged = window.AWSFavoritesQuickbar.mergeServices(userFavorites, recentServices);

              // Extract recent services from merged result (those not in user favorites)
              const userIds = new Set(userFavorites.map(u => u.id.toLowerCase()));
              const mergedRecentServices = merged.filter(service =>
                !userIds.has(service.id.toLowerCase())
              );

              // Check that the order is preserved
              for (let i = 0; i < mergedRecentServices.length - 1; i++) {
                const currentIndex = recentServices.findIndex(r => 
                  r.id.toLowerCase() === mergedRecentServices[i].id.toLowerCase()
                );
                const nextIndex = recentServices.findIndex(r => 
                  r.id.toLowerCase() === mergedRecentServices[i + 1].id.toLowerCase()
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
