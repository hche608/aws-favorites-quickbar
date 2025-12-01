/**
 * Property-based test for duplicate service filtering
 * **Feature: test-coverage, Property 8: Duplicate service filtering**
 * **Validates: Requirements 5.3**
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

describe('Duplicate Service Filtering Property Tests', () => {
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

  describe('Property 8: Duplicate service filtering', () => {
    it('should ensure no duplicate service IDs in merged result', () => {
      const serviceIdArbitrary = fc.stringOf(
        fc.constantFrom(
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
          'g',
          'h',
          'i',
          'j',
          'k',
          'l',
          'm',
          'n',
          'o',
          'p',
          'q',
          'r',
          's',
          't',
          'u',
          'v',
          'w',
          'x',
          'y',
          'z',
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '-'
        ),
        { minLength: 2, maxLength: 20 }
      );

      const serviceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 50 }),
        iconUrl: fc.oneof(fc.constant(null), fc.webUrl({ validSchemes: ['https'] })),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
        source: fc.constantFrom('user', 'recent')
      });

      // Property: For any array of services (potentially with duplicates),
      // the merged result should have no duplicate IDs (case-insensitive)
      fc.assert(
        fc.property(
          fc.array(serviceArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(serviceArbitrary, { minLength: 1, maxLength: 20 }),
          (userServices, recentServices) => {
            // Mark sources correctly
            const userFavorites = userServices.map((s) => ({ ...s, source: 'user' }));
            const recentServicesMarked = recentServices.map((s) => ({ ...s, source: 'recent' }));

            // Merge services
            const mergedServices = window.AWSFavoritesQuickbar.mergeServices(
              userFavorites,
              recentServicesMarked
            );

            // Check for duplicates (case-insensitive)
            const seenIds = new Set<string>();
            for (const service of mergedServices) {
              const lowerId = service.id.toLowerCase();
              if (seenIds.has(lowerId)) {
                return false; // Duplicate found
              }
              seenIds.add(lowerId);
            }

            return true; // No duplicates
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure merged services have no duplicates before injection', () => {
      const serviceIdArbitrary = fc.stringOf(
        fc.constantFrom(
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
          'g',
          'h',
          'i',
          'j',
          'k',
          'l',
          'm',
          'n',
          'o',
          'p',
          'q',
          'r',
          's',
          't'
        ),
        { minLength: 2, maxLength: 10 }
      );

      const serviceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 30 }),
        iconUrl: fc.constant(null),
        consoleUrl: fc.constant('https://console.aws.amazon.com/test/home'),
        source: fc.constantFrom('user', 'recent')
      });

      fc.assert(
        fc.property(fc.array(serviceArbitrary, { minLength: 1, maxLength: 15 }), (services) => {
          // Split into user and recent
          const userServices = services
            .filter((s) => s.source === 'user' || Math.random() > 0.5)
            .map((s) => ({ ...s, source: 'user' }));
          const recentServices = services
            .filter((s) => s.source === 'recent' || Math.random() > 0.5)
            .map((s) => ({ ...s, source: 'recent' }));

          // Merge services
          const mergedServices = window.AWSFavoritesQuickbar.mergeServices(
            userServices,
            recentServices
          );

          // Check for duplicates
          const seenIds = new Set<string>();
          for (const service of mergedServices) {
            const lowerId = service.id.toLowerCase();
            if (seenIds.has(lowerId)) {
              return false; // Duplicate found
            }
            seenIds.add(lowerId);
          }

          return true; // No duplicates
        }),
        { numRuns: 100 }
      );
    });

    it('should prefer user favorites over recent services when deduplicating', () => {
      const serviceIdArbitrary = fc.stringOf(
        fc.constantFrom(
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
          'g',
          'h',
          'i',
          'j',
          'k',
          'l',
          'm',
          'n',
          'o',
          'p',
          'q',
          'r',
          's',
          't'
        ),
        { minLength: 2, maxLength: 10 }
      );

      const serviceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 30 }),
        iconUrl: fc.constant(null),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
        source: fc.constant('user')
      });

      const recentServiceArbitrary = fc.record({
        id: serviceIdArbitrary,
        name: fc.string({ minLength: 1, maxLength: 30 }),
        iconUrl: fc.constant(null),
        consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
        source: fc.constant('recent')
      });

      fc.assert(
        fc.property(
          fc.array(serviceArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(recentServiceArbitrary, { minLength: 1, maxLength: 10 }),
          (userFavorites, recentServices) => {
            // Create a scenario where there's overlap
            // Take the first user favorite and add it to recent services with same ID
            if (userFavorites.length > 0 && recentServices.length > 0) {
              const duplicateId = userFavorites[0].id;
              recentServices[0] = { ...recentServices[0], id: duplicateId };
            }

            const mergedServices = window.AWSFavoritesQuickbar.mergeServices(
              userFavorites,
              recentServices
            );

            // Find the duplicate ID in merged result
            if (userFavorites.length > 0 && recentServices.length > 0) {
              const duplicateId = userFavorites[0].id.toLowerCase();
              const serviceWithDuplicateId = mergedServices.find(
                (s: any) => s.id.toLowerCase() === duplicateId
              );

              // Property: The service with the duplicate ID should be from user favorites
              if (serviceWithDuplicateId) {
                return serviceWithDuplicateId.source === 'user';
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case-insensitive duplicate detection', () => {
      const baseIdArbitrary = fc.stringOf(
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'),
        { minLength: 2, maxLength: 10 }
      );

      const serviceArbitrary = (source: string) =>
        fc.record({
          id: baseIdArbitrary,
          name: fc.string({ minLength: 1, maxLength: 30 }),
          iconUrl: fc.constant(null),
          consoleUrl: fc.webUrl({ validSchemes: ['https'] }),
          source: fc.constant(source)
        });

      fc.assert(
        fc.property(
          fc.array(serviceArbitrary('user'), { minLength: 1, maxLength: 5 }),
          fc.array(serviceArbitrary('recent'), { minLength: 1, maxLength: 5 }),
          (userFavorites, recentServices) => {
            // Create case variations of the same ID
            if (userFavorites.length > 0 && recentServices.length > 0) {
              const baseId = userFavorites[0].id.toLowerCase();
              // Make recent service have uppercase version
              recentServices[0] = { ...recentServices[0], id: baseId.toUpperCase() };
            }

            const mergedServices = window.AWSFavoritesQuickbar.mergeServices(
              userFavorites,
              recentServices
            );

            // Check that case variations are treated as duplicates
            const idCounts: Record<string, number> = {};
            for (const service of mergedServices) {
              const lowerId = service.id.toLowerCase();
              idCounts[lowerId] = (idCounts[lowerId] || 0) + 1;
            }

            // Property: No ID should appear more than once (case-insensitive)
            return Object.values(idCounts).every((count) => count === 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
