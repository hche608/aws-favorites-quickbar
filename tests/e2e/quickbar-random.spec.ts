import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';
import { setE2EFavorites, getE2EStorage, waitForInjectionStatus } from './helpers/storage';

/**
 * Simple seeded PRNG (mulberry32) for reproducible randomized tests.
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEST_SEED = Date.now();
const rng = seededRandom(TEST_SEED);

/**
 * Fisher-Yates shuffle algorithm using seeded PRNG for reproducibility.
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects a random sample of N items from an array.
 */
function sampleSize<T>(array: T[], size: number): T[] {
  return shuffle(array).slice(0, size);
}

test.describe('Quickbar Dynamic & Randomized Stress Testing', () => {
  test('should scrape all discovered services and verify random subsets and orderings', async ({
    page,
    context,
    extensionId
  }) => {
    // 1. Ensure AWS Console is loaded and user session is active
    await ensureAwsLoggedIn(page);
    console.log(`🎲 Random seed: ${TEST_SEED} (use this to reproduce failures)`);

    // 2. Wait for content script to scrape services and record status
    console.log('⏳ Waiting for content script to scrape Console services...');
    const initialStatus = await waitForInjectionStatus(context, extensionId, 25_000);
    expect(initialStatus).toBe('success');

    // 3. Retrieve all scraped services from extension storage
    const localData = await getE2EStorage(context, extensionId, 'local');
    const cachedServices = localData?.cachedServices?.services || [];
    const availableServiceIds: string[] = cachedServices.map((s: { id: string }) => s.id);

    console.log(`\n📦 Discovered ${availableServiceIds.length} unique services from AWS Console:`);
    console.log(JSON.stringify(availableServiceIds, null, 2));

    expect(availableServiceIds.length).toBeGreaterThanOrEqual(3);

    // 4. Run 3 distinct randomized test rounds to surface potential edge cases
    const testRounds = [
      { name: 'Random Subset (3 services)', count: 3 },
      { name: 'Random Subset (6 services)', count: Math.min(6, availableServiceIds.length) },
      { name: 'Full Permutation (All services shuffled)', count: availableServiceIds.length }
    ];

    for (let roundIdx = 0; roundIdx < testRounds.length; roundIdx++) {
      const { name, count } = testRounds[roundIdx];
      const selectedIds = sampleSize(availableServiceIds, count);

      console.log(`\n🎲 --- Round ${roundIdx + 1}: ${name} ---`);
      console.log(`🎯 Testing Random Selection:`, selectedIds);

      // Inject randomized favorites into sync storage
      await setE2EFavorites(context, extensionId, selectedIds);

      // Reload AWS Console to trigger content script re-injection with random favorites
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Wait for injection to complete
      const status = await waitForInjectionStatus(context, extensionId, 25_000);
      expect(status).toBe('success');

      // Verify that every single selected service is mounted in DOM
      for (const serviceId of selectedIds) {
        const itemLocator = page.locator(`[data-service-id="${serviceId}"]`);
        await expect(itemLocator).toBeVisible({ timeout: 10_000 });

        // Verify anchor links match /<serviceId>/home pattern (Rule 4)
        const anchor = itemLocator.locator('a');
        const href = await anchor.getAttribute('href');
        expect(href).toMatch(new RegExp(`/${serviceId}/home`));

        // Verify icon element is present
        const img = itemLocator.locator('img');
        await expect(img).toBeVisible();
        const src = await img.getAttribute('src');
        expect(src).toBeTruthy();
      }

      // Verify ordering: The DOM order of injected elements must match selectedIds
      const renderedServiceIds = await page.evaluate(() => {
        const injectedElements = document.querySelectorAll('[data-service-id]');
        return Array.from(injectedElements).map((el) => el.getAttribute('data-service-id'));
      });

      console.log(`📋 Injected DOM IDs:`, renderedServiceIds);

      // Verify the injected favorites appear at the start in the exact requested order
      for (let i = 0; i < selectedIds.length; i++) {
        expect(renderedServiceIds[i]).toBe(selectedIds[i]);
      }

      console.log(`✅ Round ${roundIdx + 1} passed: Order, URLs, and icons perfectly validated!`);
    }

    // Take screenshot of the final randomized quickbar
    await page.screenshot({ path: 'test-results/quickbar-randomized.png' });
    console.log(
      '📸 Saved screenshot of randomized quickbar to test-results/quickbar-randomized.png'
    );
  });
});
