import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';

/**
 * E2E Suite: Edge Cases & Error Degradation
 *
 * Validates:
 * 1. The 'no-native-pin' warning banner logic in the Popup UI.
 * 2. Strict maxServices boundaries (1 and 50) and rejection of invalid values.
 * 3. Search query edge cases (special characters, whitespace, empty state recovery).
 */
test.describe('Edge Cases & Error Handling Suite', () => {
  test('Case 1: Popup should display pinning note on "no-native-pin" and hide on "success"', async ({
    context,
    extensionId
  }) => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // 1. Simulate 'no-native-pin' status in local storage
    await popupPage.evaluate(async () => {
      await chrome.storage.local.set({ injectionStatus: 'no-native-pin' });
    });
    await popupPage.reload();
    await popupPage.waitForSelector('#pinningNote');

    const pinningNote = popupPage.locator('#pinningNote');
    await expect(pinningNote).toBeVisible();
    await expect(pinningNote).toContainText('pin at least one service manually');
    console.log('✅ Warning banner correctly displayed when injectionStatus is "no-native-pin".');

    // 2. Simulate recovery with 'success' status
    await popupPage.evaluate(async () => {
      await chrome.storage.local.set({ injectionStatus: 'success' });
    });
    await popupPage.reload();
    await popupPage.waitForSelector('#pinningNote', { state: 'attached' });

    await expect(pinningNote).toBeHidden();
    console.log('✅ Warning banner hidden when injectionStatus is "success".');

    await popupPage.close();
  });

  test('Case 2: Strict maxServices boundaries (1 and 50) and rejection of invalid values', async ({
    context,
    extensionId
  }) => {
    // 1. Open Console page
    const page = await context.newPage();
    await ensureAwsLoggedIn(page);
    await expect(page.locator('[data-service-id]').first()).toBeVisible({ timeout: 15_000 });

    // 2. Open Popup
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    const maxServicesInput = popupPage.locator('#maxServicesInput');

    // Test Boundary: maxServices = 1
    console.log('🧪 Testing lower boundary: maxServices = 1');
    await maxServicesInput.fill('1');
    await maxServicesInput.dispatchEvent('change');
    await expect(page.locator('[data-service-id]')).toHaveCount(1, { timeout: 5_000 });
    console.log('✅ Lower boundary (1 item) strictly enforced in Console!');

    // Test Boundary: maxServices = 50
    console.log('🧪 Testing upper boundary: maxServices = 50');
    await maxServicesInput.fill('50');
    await maxServicesInput.dispatchEvent('change');
    const count50 = await page.locator('[data-service-id]').count();
    expect(count50).toBeGreaterThanOrEqual(1);
    expect(count50).toBeLessThanOrEqual(50);
    console.log(`✅ Upper boundary respected (rendered ${count50} services <= 50).`);

    // Test Invalid Values: 0 and 99 (must be rejected)
    console.log('🧪 Testing invalid input rejection: 0 and 99');
    await maxServicesInput.fill('0');
    await maxServicesInput.dispatchEvent('change');

    let storageData = await popupPage.evaluate(async () => {
      return await chrome.storage.sync.get(['maxServices']);
    });
    expect(storageData.maxServices).toBe(50); // Did not overwrite with 0

    await maxServicesInput.fill('99');
    await maxServicesInput.dispatchEvent('change');

    storageData = await popupPage.evaluate(async () => {
      return await chrome.storage.sync.get(['maxServices']);
    });
    expect(storageData.maxServices).toBe(50); // Did not overwrite with 99
    console.log('✅ Invalid input values (<1 or >50) successfully rejected.');

    // Cleanup: restore to 10
    await maxServicesInput.fill('10');
    await maxServicesInput.dispatchEvent('change');

    await popupPage.close();
    await page.close();
  });

  test('Case 3: Popup search edge cases (special chars, whitespace, empty state recovery)', async ({
    context,
    extensionId
  }) => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForSelector('.service-item');

    const searchInput = popupPage.locator('#searchInput');
    const emptyState = popupPage.locator('#emptyState');
    const initialItemCount = await popupPage.locator('.service-item').count();
    expect(initialItemCount).toBeGreaterThan(0);

    // 1. Search with special characters that match nothing
    console.log('🧪 Testing search with special characters: "!@#$%^&*"');
    await searchInput.fill('!@#$%^&*');
    await popupPage.waitForTimeout(200);

    await expect(popupPage.locator('.service-item')).toHaveCount(0);
    const searchEmptyState = popupPage.locator('#serviceList .empty-state');
    await expect(searchEmptyState).toBeVisible();
    await expect(searchEmptyState).toContainText('No services found matching your search');
    console.log('✅ Empty state displayed cleanly for unmatched special characters.');

    // 2. Search with leading/trailing whitespace: "  s3   "
    console.log('🧪 Testing search with padded whitespace: "  s3   "');
    await searchInput.fill('  s3   ');
    await popupPage.waitForTimeout(200);

    const matchedItems = popupPage.locator('.service-item');
    const count = await matchedItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(popupPage.locator('.service-item[data-service-id="s3"]')).toBeVisible();
    console.log('✅ Padded search query correctly matched S3.');

    // 3. Clear search and assert full list restoration
    console.log('🧪 Testing query clearance & full list restoration');
    await searchInput.fill('');
    await popupPage.waitForTimeout(200);

    const restoredCount = await popupPage.locator('.service-item').count();
    expect(restoredCount).toBe(initialItemCount);
    await expect(emptyState).toBeHidden();
    console.log(`✅ Full service list restored (${restoredCount} items).`);

    await popupPage.close();
  });
});
