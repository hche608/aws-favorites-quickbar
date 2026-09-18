import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';

test.describe('Theme & Visual Mode E2E Tests', () => {
  test('Case 1: Default visual mode should be "dark" on initial launch', async ({
    context,
    extensionId
  }) => {
    // Reset storage to verify initial/default behavior
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    const select = popup.locator('#visualModeSelect');
    await expect(select).toBeVisible();

    // Default from STORAGE_DEFAULTS is 'dark' (auto-retries until loadSettings resolves)
    await expect(select).toHaveValue('dark');

    await popup.close();
  });

  test('Case 2: Switching to "light" mode in Popup should persist across sessions', async ({
    context,
    extensionId
  }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    // Switch to light mode
    await popup.selectOption('#visualModeSelect', 'light');

    // Verify storage was updated
    const stored = await popup.evaluate(async () => {
      return await chrome.storage.sync.get('visualMode');
    });
    expect(stored.visualMode).toBe('light');

    // Close and reopen popup to verify persistence
    await popup.close();

    const reopenedPopup = await context.newPage();
    await reopenedPopup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(reopenedPopup.locator('#visualModeSelect')).toHaveValue('light');
    await reopenedPopup.close();
  });

  test('Case 3: Switching back to "dark" mode in Popup should update and persist', async ({
    context,
    extensionId
  }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    // Switch back to dark mode
    await popup.selectOption('#visualModeSelect', 'dark');

    // Verify storage
    const stored = await popup.evaluate(async () => {
      return await chrome.storage.sync.get('visualMode');
    });
    expect(stored.visualMode).toBe('dark');

    // Reopen popup to verify persistence
    await popup.close();

    const reopenedPopup = await context.newPage();
    await reopenedPopup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(reopenedPopup.locator('#visualModeSelect')).toHaveValue('dark');
    await reopenedPopup.close();
  });

  test('Case 4: AWS Console integration applies visual mode without errors', async ({
    page,
    context,
    extensionId
  }) => {
    // Ensure AWS Console is loaded and user is authenticated
    await ensureAwsLoggedIn(page);

    // Track console page errors to ensure no runtime exceptions
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Reload AWS Console page to trigger content script setting application
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Check if AWS Console radio group exists
    const radioGroup = page.locator('[data-testid="visualModeRadioGroup"]');
    const hasRadioGroup = (await radioGroup.count()) > 0;

    if (hasRadioGroup) {
      console.log('Found [data-testid="visualModeRadioGroup"] on AWS Console page');
      const darkRadio = page.locator('input[type="radio"][value="dark"]');
      if ((await darkRadio.count()) > 0) {
        // Should be checked
        await expect(darkRadio).toBeChecked();
      }
    } else {
      console.log(
        'ℹ️ Native [data-testid="visualModeRadioGroup"] not rendered in current view (gracefully skipped)'
      );
    }

    // Verify no extension-related uncaught exceptions occurred
    const extensionErrors = errors.filter(
      (e) => e.includes('quickbar') || e.includes('visualMode')
    );
    expect(extensionErrors).toHaveLength(0);
  });
});
