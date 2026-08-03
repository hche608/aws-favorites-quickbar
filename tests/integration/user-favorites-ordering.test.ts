/**
 * Property-based test for user favorites ordering
 * **Feature: test-coverage, Property 7: User favorites ordering priority**
 * **Validates: Requirements 5.2**
 */

import * as fc from 'fast-check';
import { setupChromeMocks, clearChromeMocks } from '../helpers/mocks';
import { teardownDOM } from '../helpers/dom-helpers';
import { setupGlobalNamespace, clearGlobalNamespace } from '../helpers/global-namespace';

// Extend window interface
declare global {
  interface Window {
    AWSFavoritesQuickbar: any;
  }
}

describe('User Favorites Ordering Property Tests', () => {
  beforeEach(() => {
    setupChromeMocks();
    setupGlobalNamespace();
    teardownDOM();
  });

  afterEach(() => {
    clearChromeMocks();
    clearGlobalNamespace();
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('Property 7: User favorites ordering priority', () => {
    it('should ensure user-pinned services always appear before recent services', () => {
      // Define arbitraries for generating test data
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,15}$/);

      const serviceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.oneof(
          fc.constant(null),
          fc.webUrl({ validSchemes: ['https'] }),
          fc.string().map((s) => `data:image/svg+xml,${encodeURIComponent(s)}`)
        ),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
        source: fc.constant('user')
      });

      const recentServiceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.oneof(
          fc.constant(null),
          fc.webUrl({ validSchemes: ['https'] }),
          fc.string().map((s) => `data:image/svg+xml,${encodeURIComponent(s)}`)
        ),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
        source: fc.constant('recent')
      });

      // Property: For any set of user favorites and recent services,
      // all user favorites should appear before any recent services
      fc.assert(
        fc.property(
          fc.array(serviceArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(recentServiceArbitrary, { minLength: 1, maxLength: 10 }),
          (userFavorites, recentServices) => {
            // Ensure unique IDs within each array
            const uniqueUserFavorites = Array.from(
              new Map(userFavorites.map((s) => [s.id.toLowerCase(), s])).values()
            );
            const uniqueRecentServices = Array.from(
              new Map(recentServices.map((s) => [s.id.toLowerCase(), s])).values()
            );

            // Merge services
            const mergedServices = window.AWSFavoritesQuickbar.mergeServices(
              uniqueUserFavorites,
              uniqueRecentServices
            );

            // Find the index of the last user service
            let lastUserIndex = -1;
            for (let i = 0; i < mergedServices.length; i++) {
              if (mergedServices[i].source === 'user') {
                lastUserIndex = i;
              }
            }

            // Find the index of the first recent service
            let firstRecentIndex = mergedServices.length;
            for (let i = 0; i < mergedServices.length; i++) {
              if (mergedServices[i].source === 'recent') {
                firstRecentIndex = i;
                break;
              }
            }

            // Property: All user services should come before all recent services
            // This means lastUserIndex < firstRecentIndex (or no recent services exist)
            return lastUserIndex < firstRecentIndex;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain user favorites order in merged result', () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,15}$/);

      const serviceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.constant(null),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
        source: fc.constant('user')
      });

      const recentServiceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.constant(null),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
        source: fc.constant('recent')
      });

      fc.assert(
        fc.property(
          fc.array(serviceArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(recentServiceArbitrary, { minLength: 1, maxLength: 10 }),
          (userFavorites, recentServices) => {
            // Ensure unique IDs
            const uniqueUserFavorites = Array.from(
              new Map(userFavorites.map((s) => [s.id.toLowerCase(), s])).values()
            );
            const uniqueRecentServices = Array.from(
              new Map(recentServices.map((s) => [s.id.toLowerCase(), s])).values()
            );

            const mergedServices = window.AWSFavoritesQuickbar.mergeServices(
              uniqueUserFavorites,
              uniqueRecentServices
            );

            // Extract user services from merged result
            const userServicesInMerged = mergedServices.filter((s: any) => s.source === 'user');

            // Property: User services should maintain their original order
            for (let i = 0; i < userServicesInMerged.length; i++) {
              const originalIndex = uniqueUserFavorites.findIndex(
                (s) => s.id.toLowerCase() === userServicesInMerged[i].id.toLowerCase()
              );

              // Each user service should be found in the original array
              if (originalIndex === -1) return false;

              // Check that the relative order is preserved
              if (i > 0) {
                const prevOriginalIndex = uniqueUserFavorites.findIndex(
                  (s) => s.id.toLowerCase() === userServicesInMerged[i - 1].id.toLowerCase()
                );
                if (prevOriginalIndex >= originalIndex) return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
