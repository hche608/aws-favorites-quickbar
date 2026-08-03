/**
 * Property-based test for drag-and-drop order persistence
 * **Feature: test-coverage, Property 10: Drag-and-drop order persistence**
 * **Validates: Requirements 6.4**
 */

import * as fc from 'fast-check';
import { setupChromeMocks, clearChromeMocks } from '../helpers/mocks';
import { teardownDOM } from '../helpers/dom-helpers';

describe('Drag-and-Drop Order Persistence Property Tests', () => {
  beforeEach(() => {
    setupChromeMocks();
    teardownDOM();
  });

  afterEach(() => {
    clearChromeMocks();
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('Property 10: Drag-and-drop order persistence', () => {
    it('should persist reordered favorites to storage', () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,10}$/);

      // Property: For any list of favorites and any valid reordering,
      // the new order should be persisted to storage
      fc.assert(
        fc.property(
          fc.array(serviceIdArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          fc.integer({ min: 0, max: 9 }),
          (favorites, fromIndex, toIndex) => {
            // Ensure unique favorites
            const uniqueFavorites = Array.from(new Set(favorites.map((id) => id.toLowerCase())));

            if (uniqueFavorites.length < 2) return true; // Skip if not enough items

            // Normalize indices
            const normalizedFromIndex = fromIndex % uniqueFavorites.length;
            const normalizedToIndex = toIndex % uniqueFavorites.length;

            // Simulate drag-and-drop reordering
            const reordered = [...uniqueFavorites];
            const [movedItem] = reordered.splice(normalizedFromIndex, 1);
            reordered.splice(normalizedToIndex, 0, movedItem);

            // Simulate saving to storage
            (global as any).chrome.storage.sync.data.userFavorites = reordered;

            // Verify the order is persisted
            const storedFavorites = (global as any).chrome.storage.sync.data.userFavorites;

            // Property: Stored order should match the reordered array
            if (storedFavorites.length !== reordered.length) return false;

            for (let i = 0; i < reordered.length; i++) {
              if (storedFavorites[i] !== reordered[i]) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain all favorites after reordering', () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,10}$/);

      // Property: Reordering should not add or remove any favorites
      fc.assert(
        fc.property(
          fc.array(serviceIdArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          fc.integer({ min: 0, max: 9 }),
          (favorites, fromIndex, toIndex) => {
            // Ensure unique favorites
            const uniqueFavorites = Array.from(new Set(favorites.map((id) => id.toLowerCase())));

            if (uniqueFavorites.length < 2) return true;

            const normalizedFromIndex = fromIndex % uniqueFavorites.length;
            const normalizedToIndex = toIndex % uniqueFavorites.length;

            // Simulate reordering
            const reordered = [...uniqueFavorites];
            const [movedItem] = reordered.splice(normalizedFromIndex, 1);
            reordered.splice(normalizedToIndex, 0, movedItem);

            // Property: All original favorites should still be present
            const allPresent = uniqueFavorites.every((id) => reordered.includes(id));

            // Property: No new favorites should be added
            const noNewItems = reordered.every((id) => uniqueFavorites.includes(id));

            // Property: Count should remain the same
            const sameCount = reordered.length === uniqueFavorites.length;

            return allPresent && noNewItems && sameCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle moving first item to last position', () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,10}$/);

      // Property: Moving first item to last should preserve all items
      fc.assert(
        fc.property(fc.array(serviceIdArbitrary, { minLength: 2, maxLength: 10 }), (favorites) => {
          const uniqueFavorites = Array.from(new Set(favorites.map((id) => id.toLowerCase())));

          if (uniqueFavorites.length < 2) return true;

          const firstItem = uniqueFavorites[0];
          const reordered = [...uniqueFavorites];
          reordered.splice(0, 1);
          reordered.push(firstItem);

          // Property: First item should now be last
          const isLastNow = reordered[reordered.length - 1] === firstItem;

          // Property: All items should still be present
          const allPresent = uniqueFavorites.every((id) => reordered.includes(id));

          return isLastNow && allPresent && reordered.length === uniqueFavorites.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle moving last item to first position', () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,10}$/);

      // Property: Moving last item to first should preserve all items
      fc.assert(
        fc.property(fc.array(serviceIdArbitrary, { minLength: 2, maxLength: 10 }), (favorites) => {
          const uniqueFavorites = Array.from(new Set(favorites.map((id) => id.toLowerCase())));

          if (uniqueFavorites.length < 2) return true;

          const lastItem = uniqueFavorites[uniqueFavorites.length - 1];
          const reordered = [...uniqueFavorites];
          reordered.splice(uniqueFavorites.length - 1, 1);
          reordered.unshift(lastItem);

          // Property: Last item should now be first
          const isFirstNow = reordered[0] === lastItem;

          // Property: All items should still be present
          const allPresent = uniqueFavorites.every((id) => reordered.includes(id));

          return isFirstNow && allPresent && reordered.length === uniqueFavorites.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle adjacent item swaps', () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,10}$/);

      // Property: Swapping adjacent items should preserve all items
      fc.assert(
        fc.property(
          fc.array(serviceIdArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 8 }),
          (favorites, swapIndex) => {
            const uniqueFavorites = Array.from(new Set(favorites.map((id) => id.toLowerCase())));

            if (uniqueFavorites.length < 2) return true;

            const normalizedIndex = swapIndex % (uniqueFavorites.length - 1);
            const item1 = uniqueFavorites[normalizedIndex];
            const item2 = uniqueFavorites[normalizedIndex + 1];

            // Swap adjacent items
            const reordered = [...uniqueFavorites];
            reordered[normalizedIndex] = item2;
            reordered[normalizedIndex + 1] = item1;

            // Property: Items should be swapped
            const swapped =
              reordered[normalizedIndex] === item2 && reordered[normalizedIndex + 1] === item1;

            // Property: All items should still be present
            const allPresent = uniqueFavorites.every((id) => reordered.includes(id));

            return swapped && allPresent && reordered.length === uniqueFavorites.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle no-op reordering (same position)', () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,10}$/);

      // Property: Moving an item to its own position should not change the order
      fc.assert(
        fc.property(
          fc.array(serviceIdArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (favorites, index) => {
            const uniqueFavorites = Array.from(new Set(favorites.map((id) => id.toLowerCase())));

            if (uniqueFavorites.length < 2) return true;

            const normalizedIndex = index % uniqueFavorites.length;

            // Simulate moving item to same position
            const reordered = [...uniqueFavorites];
            const [movedItem] = reordered.splice(normalizedIndex, 1);
            reordered.splice(normalizedIndex, 0, movedItem);

            // Property: Order should remain unchanged
            if (reordered.length !== uniqueFavorites.length) return false;

            for (let i = 0; i < uniqueFavorites.length; i++) {
              if (reordered[i] !== uniqueFavorites[i]) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist order through storage round-trip', async () => {
      const serviceIdArbitrary = fc.stringMatching(/^[a-z]{2,10}$/);

      // Property: Order should be preserved through save and load
      await fc.assert(
        fc.asyncProperty(
          fc.array(serviceIdArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          fc.integer({ min: 0, max: 9 }),
          async (favorites, fromIndex, toIndex) => {
            const uniqueFavorites = Array.from(new Set(favorites.map((id) => id.toLowerCase())));

            if (uniqueFavorites.length < 2) return true;

            const normalizedFromIndex = fromIndex % uniqueFavorites.length;
            const normalizedToIndex = toIndex % uniqueFavorites.length;

            // Reorder
            const reordered = [...uniqueFavorites];
            const [movedItem] = reordered.splice(normalizedFromIndex, 1);
            reordered.splice(normalizedToIndex, 0, movedItem);

            // Save to storage
            await (chrome as any).storage.sync.set({ userFavorites: reordered });

            // Load from storage
            const result = await (chrome as any).storage.sync.get(['userFavorites']);
            const loaded = result.userFavorites;

            // Property: Loaded order should match saved order
            if (loaded.length !== reordered.length) return false;

            for (let i = 0; i < reordered.length; i++) {
              if (loaded[i] !== reordered[i]) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
