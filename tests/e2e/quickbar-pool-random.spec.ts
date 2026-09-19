import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';
import { setE2EFavorites, setE2ECachedServices, waitForInjectionStatus } from './helpers/storage';
import { REAL_AWS_SERVICES, getRealServices } from '../helpers/real-services';

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

test.describe('Quickbar Full 220-Service Pool Random Stress Testing', () => {
  // Filter for standard AWS services that conform to /<serviceId>/home (Rule 4)
  const STANDARD_SERVICES = REAL_AWS_SERVICES.filter(
    (s) => s.consoleUrl.match(/\/([^\/]+)\/home/) !== null
  );

  test('should randomly sample from full 220-service pool and verify navbar injection', async ({
    page,
    context,
    extensionId
  }) => {
    // 1. Ensure AWS Console is loaded and session is valid
    await ensureAwsLoggedIn(page);
    console.log(`🎲 Random seed: ${TEST_SEED} (use this to reproduce failures)`);

    // 2. Pre-seed local storage with all 220 services
    const allServices = getRealServices();
    await setE2ECachedServices(context, extensionId, allServices);

    const availableIds = STANDARD_SERVICES.map((s) => s.id);
    console.log(`\n🌐 Full available standard services pool size: ${availableIds.length}`);

    // 3. Define 3 testing rounds with increasing sample sizes
    const testRounds = [
      { name: 'Random Selection (5 services)', count: 5 },
      { name: 'Random Selection (8 services)', count: 8 },
      { name: 'Full Quickbar Selection (10 services)', count: 10 }
    ];

    for (let roundIdx = 0; roundIdx < testRounds.length; roundIdx++) {
      const { name, count } = testRounds[roundIdx];
      const selectedIds = sampleSize(availableIds, count);

      console.log(`\n🎲 --- Round ${roundIdx + 1}: ${name} ---`);
      console.log(`🎯 Testing Random Services:`, selectedIds);

      // Inject chosen random favorites into sync storage
      await setE2EFavorites(context, extensionId, selectedIds);

      // Reload AWS Console to trigger content script injection
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Wait for content script injection status
      const status = await waitForInjectionStatus(context, extensionId, 25_000);
      expect(status).toBe('success');

      // Verify each selected service is rendered in the navbar
      for (const serviceId of selectedIds) {
        const itemLocator = page.locator(`[data-service-id="${serviceId}"]`);
        await expect(itemLocator).toBeVisible({ timeout: 10_000 });

        // Verify anchor link strictly adheres to Rule 4 (/<serviceId>/home)
        const anchor = itemLocator.locator('a');
        const href = await anchor.getAttribute('href');
        expect(href).toMatch(new RegExp(`/${serviceId}/home`));

        // Verify icon element is present and has a valid src
        const img = itemLocator.locator('img');
        await expect(img).toBeVisible();
        const src = await img.getAttribute('src');
        expect(src).toBeTruthy();
      }

      // Verify DOM ordering matches the selected array exactly
      const renderedServiceIds = await page.evaluate(() => {
        const injectedElements = document.querySelectorAll('[data-service-id]');
        return Array.from(injectedElements).map((el) => el.getAttribute('data-service-id'));
      });

      console.log(`📋 Injected DOM IDs:`, renderedServiceIds);

      for (let i = 0; i < selectedIds.length; i++) {
        expect(renderedServiceIds[i]).toBe(selectedIds[i]);
      }

      console.log(`✅ Round ${roundIdx + 1} passed: ${count} random services verified!`);
    }

    // Capture screenshot of final randomized navbar
    await page.screenshot({ path: 'test-results/quickbar-pool-randomized.png' });
    console.log('📸 Screenshot saved to test-results/quickbar-pool-randomized.png');
  });
});
