import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';

/**
 * E2E Suite: Real-Time Cross-Tab Synchronization
 *
 * Verifies that when a user updates favorites or settings in the Popup UI,
 * all active concurrent AWS Console tabs automatically receive the update
 * and re-render their quickbars in real time without requiring manual page reload.
 */
test.describe('Real-Time Cross-Tab Sync Suite', () => {
  test('should synchronize favorites and maxServices across multiple tabs in real time', async ({
    context,
    extensionId
  }) => {
    // 1. Open Tab 1 (Console Home)
    const page1 = await context.newPage();
    await ensureAwsLoggedIn(page1);
    await expect(page1.locator('[data-service-id]').first()).toBeVisible({ timeout: 15_000 });
    console.log('✅ Tab 1 (Console Home) Quickbar initialized.');

    // 2. Open Tab 2 (S3 Console)
    const page2 = await context.newPage();
    console.log('🚀 Opening Tab 2 (S3 Console)...');
    await page2.goto(
      'https://ap-southeast-2.console.aws.amazon.com/s3/home?region=ap-southeast-2',
      { waitUntil: 'domcontentloaded' }
    );
    await expect(page2.locator('[data-service-id]').first()).toBeVisible({ timeout: 15_000 });
    console.log('✅ Tab 2 (S3 Console) Quickbar initialized.');

    // 3. Open Tab 3 (Extension Popup)
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForSelector('.service-item');
    console.log('✅ Tab 3 (Popup) loaded.');

    // 4. In Popup: Pin an unselected service by clicking its checkbox
    const unselectedRow = popupPage.locator('.service-item:not(.selected)').first();
    await expect(unselectedRow).toBeVisible();
    const serviceIdToPin = await unselectedRow.getAttribute('data-service-id');
    if (!serviceIdToPin) {
      throw new Error('Unselected service ID not found');
    }

    const targetRow = popupPage.locator(`.service-item[data-service-id="${serviceIdToPin}"]`);
    console.log(`\n📌 Pinning "${serviceIdToPin}" via Popup UI...`);
    await targetRow.locator('input[type="checkbox"]').click();
    await expect(targetRow).toHaveClass(/selected/);
    console.log(`⭐ "${serviceIdToPin}" pinned in Popup.`);

    // 5. Verify Tab 1 (Console Home) updates in real time WITHOUT reload
    console.log(`⏳ Checking Tab 1 (Console Home) for real-time update...`);
    await expect(page1.locator(`[data-service-id="${serviceIdToPin}"]`)).toBeVisible({
      timeout: 5_000
    });
    console.log(`🎉 Tab 1 updated with "${serviceIdToPin}" without reload!`);

    // 6. Verify Tab 2 (S3 Console) updates in real time WITHOUT reload
    console.log(`⏳ Checking Tab 2 (S3 Console) for real-time update...`);
    await expect(page2.locator(`[data-service-id="${serviceIdToPin}"]`)).toBeVisible({
      timeout: 5_000
    });
    console.log(`🎉 Tab 2 updated with "${serviceIdToPin}" without reload!`);

    // 7. In Popup: Update maxServices to 3
    console.log('\n⚙️ Setting maxServices to 3 in Popup UI...');
    const maxServicesInput = popupPage.locator('#maxServicesInput');
    await maxServicesInput.fill('3');
    await maxServicesInput.dispatchEvent('change');
    console.log('💾 maxServices set to 3.');

    // 8. Verify both Tab 1 and Tab 2 automatically truncate quickbars to 3 items
    console.log('⏳ Verifying Quickbar item count in Tab 1 and Tab 2...');
    await expect(page1.locator('[data-service-id]')).toHaveCount(3, { timeout: 5_000 });
    console.log('🎉 Tab 1 Quickbar item count is exactly 3!');

    await expect(page2.locator('[data-service-id]')).toHaveCount(3, { timeout: 5_000 });
    console.log('🎉 Tab 2 Quickbar item count is exactly 3!');

    // 9. Cleanup: Restore maxServices to 10 in Popup
    await maxServicesInput.fill('10');
    await maxServicesInput.dispatchEvent('change');

    await popupPage.close();
    await page2.close();
    await page1.close();
  });
});
