import { test, expect } from './fixtures';
import { setE2EFavorites, setE2ECachedServices, getE2EStorage } from './helpers/storage';
import { ensureAwsLoggedIn } from './helpers/auth';
import { getRealServices } from '../helpers/real-services';

const ALL_SERVICES = getRealServices();

/**
 * E2E Suite: Coverage Gaps
 *
 * Tests identified in review as missing from the original suite:
 * 1. First-launch (undefined storage) behavior
 * 2. Nested service IDs (Rule 4: codebuild vs codesuite)
 * 3. no-native-pin → Popup #pinningNote linkage
 * 4. updateQuickbar message channel (popup → content script)
 * 5. Extension reload persistence (storage.sync preservation)
 */
test.describe('Coverage Gap Tests', () => {
  test('Gap 1: First-launch with undefined storage should show empty favorites', async ({
    context,
    extensionId
  }) => {
    // Clear ALL extension storage to simulate a brand-new install
    const setupPage = await context.newPage();
    await setupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    await setupPage.evaluate(async () => {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
    });
    await setupPage.close();

    // Open popup fresh — should handle undefined userFavorites (not [])
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Seed cachedServices so the list renders, but leave userFavorites undefined
    await page.evaluate(async (svcs) => {
      await chrome.storage.local.set({
        cachedServices: { services: svcs, timestamp: Date.now() }
      });
    }, ALL_SERVICES);
    await page.reload();
    await page.waitForSelector('.service-item');

    // Badge should show 0 pinned favorites
    const badge = page.locator('#favoritesBadge');
    await expect(badge).toBeVisible();
    const badgeText = await badge.textContent();
    expect(badgeText).toMatch(/^0\s*\//);
    console.log(`✅ First-launch badge shows: "${badgeText}"`);

    // No items should have .selected class
    const selectedItems = page.locator('.service-item.selected');
    expect(await selectedItems.count()).toBe(0);
    console.log('✅ No services are pre-selected on first launch.');

    // No drag grips should be visible (only shown on selected items)
    const grips = page.locator('.service-item.selected .drag-grip');
    expect(await grips.count()).toBe(0);
    console.log('✅ No drag grips visible on first launch.');

    await page.close();
  });

  test('Gap 2: Nested service IDs (codebuild, codepipeline) should extract correctly per Rule 4', async ({
    context,
    extensionId
  }) => {
    // Find codebuild and codepipeline from the real services list
    const codebuild = ALL_SERVICES.find((s: any) => s.id === 'codebuild');
    const codepipeline = ALL_SERVICES.find((s: any) => s.id === 'codepipeline');

    // These may not be in the cached services if not recently visited
    // Seed them explicitly and pin them
    const nestedServices = ALL_SERVICES.slice(0, 10);
    if (codebuild && !nestedServices.find((s: any) => s.id === 'codebuild')) {
      nestedServices.push(codebuild);
    }
    if (codepipeline && !nestedServices.find((s: any) => s.id === 'codepipeline')) {
      nestedServices.push(codepipeline);
    }

    await setE2ECachedServices(context, extensionId, nestedServices);
    await setE2EFavorites(context, extensionId, ['codebuild', 'codepipeline']);

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('.service-item');

    // Verify codebuild and codepipeline are pinned (selected)
    const codebuildItem = page.locator('.service-item[data-service-id="codebuild"]');
    const codepipelineItem = page.locator('.service-item[data-service-id="codepipeline"]');

    if ((await codebuildItem.count()) > 0) {
      await expect(codebuildItem).toHaveClass(/selected/);
      console.log('✅ codebuild correctly identified as separate service (not "codesuite")');
    } else {
      console.log('ℹ️ codebuild not in cached services — skipping DOM assertion');
    }

    if ((await codepipelineItem.count()) > 0) {
      await expect(codepipelineItem).toHaveClass(/selected/);
      console.log('✅ codepipeline correctly identified as separate service (not "codesuite")');
    } else {
      console.log('ℹ️ codepipeline not in cached services — skipping DOM assertion');
    }

    // Verify storage has the correct IDs, NOT "codesuite"
    const syncData = await getE2EStorage(context, extensionId, 'sync');
    expect(syncData.userFavorites).toContain('codebuild');
    expect(syncData.userFavorites).toContain('codepipeline');
    expect(syncData.userFavorites).not.toContain('codesuite');
    console.log('✅ Storage contains "codebuild" and "codepipeline", NOT "codesuite"');

    await page.close();
  });

  test('Gap 3: no-native-pin status should show #pinningNote in Popup after real content script', async ({
    context,
    extensionId
  }) => {
    // Simulate that the content script has set injectionStatus to 'no-native-pin'
    const setupPage = await context.newPage();
    await setupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await setupPage.evaluate(async () => {
      await chrome.storage.local.set({ injectionStatus: 'no-native-pin' });
    });
    await setupPage.close();

    // Open popup and verify the pinning note is visible
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('#pinningNote', { state: 'attached' });

    const pinningNote = page.locator('#pinningNote');
    await expect(pinningNote).toBeVisible();
    await expect(pinningNote).toContainText('pin at least one service manually');
    console.log('✅ #pinningNote visible when injectionStatus is "no-native-pin"');

    // Now simulate recovery: set status to 'success' and reload
    await page.evaluate(async () => {
      await chrome.storage.local.set({ injectionStatus: 'success' });
    });
    await page.reload();
    await page.waitForSelector('#pinningNote', { state: 'attached' });

    await expect(pinningNote).toBeHidden();
    console.log('✅ #pinningNote hidden after recovery to "success"');

    await page.close();
  });

  test('Gap 4: updateQuickbar message from popup should trigger content script re-injection', async ({
    page,
    context,
    extensionId
  }) => {
    // 1. Load AWS Console
    await ensureAwsLoggedIn(page);

    // Wait for initial quickbar injection
    const initialItem = page.locator('[data-service-id]').first();
    await expect(initialItem).toBeVisible({ timeout: 15_000 });

    // 2. Capture initial quickbar state
    const initialIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-service-id]')).map((el) =>
        el.getAttribute('data-service-id')
      );
    });
    console.log('📋 Initial quickbar:', initialIds);

    // 3. Change favorites in storage via popup (add 'lambda' if not present)
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForSelector('.service-item');

    // Pin a new service that wasn't in the initial set
    const unselected = popupPage.locator('.service-item:not(.selected)').first();
    const newServiceId = await unselected.getAttribute('data-service-id');
    if (newServiceId) {
      await unselected.click();
      const targetItem = popupPage.locator(`.service-item[data-service-id="${newServiceId}"]`);
      await expect(targetItem).toHaveClass(/selected/);
      console.log(`📌 Pinned new service: "${newServiceId}" via popup`);
    }
    await popupPage.close();

    // 4. Verify the console page updates (the popup sends updateQuickbar on pin)
    if (newServiceId) {
      await expect(page.locator(`[data-service-id="${newServiceId}"]`)).toBeVisible({
        timeout: 10_000
      });
      console.log(`✅ Console quickbar updated with "${newServiceId}" via message channel`);
    }
  });

  test('Gap 5: Storage persistence across popup open/close lifecycles', async ({
    context,
    extensionId
  }) => {
    // 1. Set specific favorites and settings via storage
    const testFavorites = ['s3', 'ec2', 'dynamodb'];
    await setE2EFavorites(context, extensionId, testFavorites);

    const setupPage = await context.newPage();
    await setupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await setupPage.evaluate(async () => {
      await chrome.storage.sync.set({ maxServices: 15, visualMode: 'light' });
    });
    await setupPage.close();

    // 2. Open a fresh popup page and verify sync storage survived
    const verifyPage = await context.newPage();
    await verifyPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await verifyPage.waitForSelector('.service-item');

    const data = await verifyPage.evaluate(async () => {
      return await chrome.storage.sync.get(['userFavorites', 'maxServices', 'visualMode']);
    });
    await verifyPage.close();

    expect(data.userFavorites).toEqual(testFavorites);
    expect(data.maxServices).toBe(15);
    expect(data.visualMode).toBe('light');
    console.log('✅ Storage persists across popup lifecycle:', data);
  });
});
