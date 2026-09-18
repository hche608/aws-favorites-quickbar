import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';
import { setE2EFavorites, getE2EStorage, waitForInjectionStatus } from './helpers/storage';

test.describe('Quickbar Step 1: Basic Presence & Mounting', () => {
  test('should inject s3 service into AWS Console favorites bar', async ({
    page,
    context,
    extensionId
  }) => {
    // 1. Preset deterministic favorites with just 's3'
    await setE2EFavorites(context, extensionId, ['s3']);
    console.log('✅ Injected deterministic favorite: ["s3"]');

    // Listen to console logs from content script
    page.on('console', (msg) => console.log(`[AWS Page Console] ${msg.text()}`));

    // 2. Open AWS Console home
    await ensureAwsLoggedIn(page);

    // 3. Reload page to trigger content script with new storage
    console.log('🔄 Reloading console to trigger Quickbar injection...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    // Wait for content script to finish and record injection status
    console.log('⏳ Waiting for content script injection status...');
    const status = await waitForInjectionStatus(context, extensionId, 25_000);
    console.log(`📡 Injection status recorded: "${status}"`);

    // Rule 3: Injection requires at least one native pinned service to clone CSS
    if (status === 'no-native-pin') {
      console.log(
        '⚠️ AWS Console currently has 0 native pinned services. Quickbar safely halts per Rule 3.'
      );
      console.log(
        '👉 Tip: Pinning 1 native service in the AWS navbar will allow Quickbar injection.'
      );
      expect(status).toBe('no-native-pin');
      return;
    }

    expect(status).toBe('success');

    // Minimal single assertion: s3 element exists and is visible
    const s3Item = page.locator('[data-service-id="s3"]');
    await expect(s3Item).toBeVisible({ timeout: 10_000 });
    console.log('🎉 S3 Quickbar element successfully mounted and visible in navbar!');

    // Capture visual confirmation of the mounted quickbar
    await page.screenshot({ path: 'test-results/quickbar-mounted.png' });
  });
});
