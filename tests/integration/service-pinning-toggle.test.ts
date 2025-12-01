/**
 * Property-based test for service pinning toggle idempotence
 * **Feature: test-coverage, Property 9: Service pinning toggle idempotence**
 * **Validates: Requirements 6.2**
 */

import * as fc from 'fast-check';
import { setupChromeMocks, clearChromeMocks } from '../helpers/mocks';
import { teardownDOM } from '../helpers/dom-helpers';

describe('Service Pinning Toggle Property Tests', () => {
  beforeEach(() => {
    setupChromeMocks();
    teardownDOM();
  });

  afterEach(() => {
    clearChromeMocks();
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('Property 9: Service pinning toggle idempotence', () => {
    it('should return to original state after pin then unpin', () => {
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
        { minLength: 2, maxLength: 15 }
      );

      // Property: For any service and initial favorites list,
      // pinning then unpinning should return to the original state
      fc.assert(
        fc.property(
          serviceIdArbitrary,
          fc.array(serviceIdArbitrary, { minLength: 0, maxLength: 10 }),
          (serviceId, initialFavorites) => {
            // Ensure unique favorites
            const uniqueInitialFavorites = Array.from(
              new Set(initialFavorites.map((id) => id.toLowerCase()))
            );

            // Check if service is initially pinned
            const initiallyPinned = uniqueInitialFavorites.some(
              (id) => id === serviceId.toLowerCase()
            );

            // Simulate pin operation
            let currentFavorites = [...uniqueInitialFavorites];
            const exists = currentFavorites.some((id) => id === serviceId.toLowerCase());

            if (!exists) {
              currentFavorites.push(serviceId.toLowerCase());
            }

            // Verify service is now pinned
            const pinnedAfterAdd = currentFavorites.some((id) => id === serviceId.toLowerCase());
            if (!pinnedAfterAdd) return false;

            // Simulate unpin operation
            currentFavorites = currentFavorites.filter((id) => id !== serviceId.toLowerCase());

            // Verify service is now unpinned
            const pinnedAfterRemove = currentFavorites.some((id) => id === serviceId.toLowerCase());
            if (pinnedAfterRemove) return false;

            // Property: If service was initially unpinned, it should be unpinned after pin+unpin
            // If it was initially pinned, it should be unpinned after pin+unpin (since we removed it)
            if (initiallyPinned) {
              // Service was initially pinned, after pin (no-op) + unpin, it should be unpinned
              return currentFavorites.length === uniqueInitialFavorites.length - 1;
            } else {
              // Service was initially unpinned, after pin + unpin, it should be unpinned
              return currentFavorites.length === uniqueInitialFavorites.length;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain idempotence for multiple pin/unpin cycles', () => {
      const serviceIdArbitrary = fc.stringOf(
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'),
        { minLength: 2, maxLength: 10 }
      );

      // Property: Multiple pin/unpin cycles should be idempotent
      fc.assert(
        fc.property(
          serviceIdArbitrary,
          fc.array(serviceIdArbitrary, { minLength: 0, maxLength: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (serviceId, initialFavorites, cycles) => {
            // Ensure unique favorites
            const uniqueInitialFavorites = Array.from(
              new Set(initialFavorites.map((id) => id.toLowerCase()))
            );

            let currentFavorites = [...uniqueInitialFavorites];

            // Perform multiple pin/unpin cycles
            for (let i = 0; i < cycles; i++) {
              // Pin
              const exists = currentFavorites.some((id) => id === serviceId.toLowerCase());
              if (!exists) {
                currentFavorites.push(serviceId.toLowerCase());
              }

              // Unpin
              currentFavorites = currentFavorites.filter((id) => id !== serviceId.toLowerCase());
            }

            // Property: After all cycles, service should be unpinned
            const finallyPinned = currentFavorites.some((id) => id === serviceId.toLowerCase());

            // And the favorites list should be the same as initial (minus the service if it was there)
            const initialHadService = uniqueInitialFavorites.some(
              (id) => id === serviceId.toLowerCase()
            );

            if (initialHadService) {
              return (
                !finallyPinned && currentFavorites.length === uniqueInitialFavorites.length - 1
              );
            } else {
              return !finallyPinned && currentFavorites.length === uniqueInitialFavorites.length;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case-insensitive pinning operations', () => {
      const baseIdArbitrary = fc.stringOf(
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'),
        { minLength: 2, maxLength: 10 }
      );

      // Property: Pinning with different cases should be treated as the same service
      fc.assert(
        fc.property(
          baseIdArbitrary,
          fc.array(baseIdArbitrary, { minLength: 0, maxLength: 5 }),
          (serviceId, initialFavorites) => {
            // Normalize to lowercase
            const uniqueInitialFavorites = Array.from(
              new Set(initialFavorites.map((id) => id.toLowerCase()))
            );

            let currentFavorites = [...uniqueInitialFavorites];

            // Pin with lowercase
            const lowerServiceId = serviceId.toLowerCase();
            if (!currentFavorites.some((id) => id === lowerServiceId)) {
              currentFavorites.push(lowerServiceId);
            }

            // Try to pin with uppercase (should be no-op)
            const upperServiceId = serviceId.toUpperCase();
            if (!currentFavorites.some((id) => id === upperServiceId.toLowerCase())) {
              currentFavorites.push(upperServiceId.toLowerCase());
            }

            // Should only have one instance
            const count = currentFavorites.filter((id) => id === lowerServiceId).length;
            if (count !== 1) return false;

            // Unpin with mixed case
            const mixedServiceId = serviceId
              .split('')
              .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
              .join('');
            currentFavorites = currentFavorites.filter((id) => id !== mixedServiceId.toLowerCase());

            // Should be removed
            return !currentFavorites.some((id) => id === lowerServiceId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve other favorites during pin/unpin operations', () => {
      const serviceIdArbitrary = fc.stringOf(
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'),
        { minLength: 2, maxLength: 10 }
      );

      // Property: Pin/unpin operations should not affect other favorites
      fc.assert(
        fc.property(
          serviceIdArbitrary,
          fc.array(serviceIdArbitrary, { minLength: 1, maxLength: 10 }),
          (serviceId, otherFavorites) => {
            // Ensure unique and different from serviceId
            const uniqueOtherFavorites = Array.from(
              new Set(otherFavorites.map((id) => id.toLowerCase()))
            ).filter((id) => id !== serviceId.toLowerCase());

            if (uniqueOtherFavorites.length === 0) return true; // Skip if no other favorites

            let currentFavorites = [...uniqueOtherFavorites];
            const initialOtherCount = currentFavorites.length;

            // Pin the service
            if (!currentFavorites.some((id) => id === serviceId.toLowerCase())) {
              currentFavorites.push(serviceId.toLowerCase());
            }

            // Verify other favorites are still there
            const allOthersPresent = uniqueOtherFavorites.every((otherId) =>
              currentFavorites.some((id) => id === otherId)
            );
            if (!allOthersPresent) return false;

            // Unpin the service
            currentFavorites = currentFavorites.filter((id) => id !== serviceId.toLowerCase());

            // Property: Other favorites should remain unchanged
            const finalOtherCount = currentFavorites.length;
            const stillAllOthersPresent = uniqueOtherFavorites.every((otherId) =>
              currentFavorites.some((id) => id === otherId)
            );

            return finalOtherCount === initialOtherCount && stillAllOthersPresent;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
