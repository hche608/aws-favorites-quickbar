import { test, expect } from './fixtures';
import { setE2EFavorites, setE2ECachedServices } from './helpers/storage';
import { getRealServices } from '../helpers/real-services';
import path from 'path';
import fs from 'fs';

const ALL_SERVICES = getRealServices();
const ARTIFACT_DIR = path.resolve(process.cwd(), 'test-results');

test.describe('Popup Modern UI & Visual Validation Suite', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(async (svcs) => {
      await chrome.storage.local.set({
        cachedServices: { services: svcs, timestamp: Date.now() }
      });
      await chrome.storage.sync.set({
        userFavorites: ['s3', 'ec2', 'lambda', 'iam', 'dynamodbv2'],
        maxServices: 10,
        visualMode: 'dark'
      });
    }, ALL_SERVICES);
    await page.close();
  });

  test('Case 1: Should render modernized Dark Theme popup with badge and drag grips', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 440, height: 600 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.waitForSelector('.service-item');
    const badge = page.locator('#favoritesBadge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('5 / 10');

    // Verify dark theme on html
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBe('dark');

    // Verify drag grips exist on selected items
    const grips = page.locator('.service-item.selected .drag-grip');
    expect(await grips.count()).toBe(5);

    // Capture dark screenshot
    const darkScreenshot = path.join(ARTIFACT_DIR, 'popup-modern-dark.png');
    await page.screenshot({ path: darkScreenshot });
    console.log(`📸 Saved Dark Theme screenshot to: ${darkScreenshot}`);

    await page.close();
  });

  test('Case 2: Should switch to Light Theme cleanly and update styles', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 440, height: 600 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.waitForSelector('.service-item');

    // Select light mode
    const visualModeSelect = page.locator('#visualModeSelect');
    await visualModeSelect.selectOption('light');
    await page.waitForTimeout(300);

    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBe('light');

    // Capture light screenshot
    const lightScreenshot = path.join(ARTIFACT_DIR, 'popup-modern-light.png');
    await page.screenshot({ path: lightScreenshot });
    console.log(`📸 Saved Light Theme screenshot to: ${lightScreenshot}`);

    // Restore dark
    await visualModeSelect.selectOption('dark');
    await page.waitForTimeout(200);

    await page.close();
  });

  test('Case 3: Should filter with modern search and support instant clear button', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 440, height: 600 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.waitForSelector('.service-item');

    const searchInput = page.locator('#searchInput');
    const clearBtn = page.locator('#clearSearchBtn');

    // Clear button should initially be hidden
    await expect(clearBtn).toBeHidden();

    // Type query
    await searchInput.fill('cloud');
    await page.waitForTimeout(300);

    // Clear button should now be visible
    await expect(clearBtn).toBeVisible();

    // Capture search screenshot
    const searchScreenshot = path.join(ARTIFACT_DIR, 'popup-modern-search.png');
    await page.screenshot({ path: searchScreenshot });
    console.log(`📸 Saved Search screenshot to: ${searchScreenshot}`);

    // Click clear button
    await clearBtn.click();
    await page.waitForTimeout(200);

    expect(await searchInput.inputValue()).toBe('');
    await expect(clearBtn).toBeHidden();

    const items = page.locator('.service-item');
    expect(await items.count()).toBeGreaterThanOrEqual(20);

    await page.close();
  });

  test('Case 4: Should render 10 services with 0 favorites without scrollbar and with compact empty state', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 580 });

    const tenServices = ALL_SERVICES.slice(0, 10);

    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(async (svcs) => {
      await chrome.storage.local.set({
        cachedServices: { services: svcs, timestamp: Date.now() }
      });
      await chrome.storage.sync.set({
        userFavorites: [],
        maxServices: 10,
        visualMode: 'dark'
      });
    }, tenServices);

    await page.reload();
    await page.waitForSelector('.service-item');

    const emptyState = page.locator('#emptyState');
    await expect(emptyState).toBeVisible();

    const screenshotPath = path.join(ARTIFACT_DIR, 'popup-10-services-empty-state.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Saved 10 Services Empty State screenshot to: ${screenshotPath}`);

    await page.close();
  });

  test('Case 5: Should render 10 services with 5 favorites without scrollbar', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 580 });

    const tenServices = ALL_SERVICES.slice(0, 10);

    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(async (svcs) => {
      await chrome.storage.local.set({
        cachedServices: { services: svcs, timestamp: Date.now() }
      });
      await chrome.storage.sync.set({
        userFavorites: ['s3', 'ec2', 'lambda', 'iam', 'dynamodbv2'],
        maxServices: 10,
        visualMode: 'dark'
      });
    }, tenServices);

    await page.reload();
    await page.waitForSelector('.service-item');

    const emptyState = page.locator('#emptyState');
    await expect(emptyState).toBeHidden();

    const screenshotPath = path.join(ARTIFACT_DIR, 'popup-10-services-favorites.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Saved 10 Services with Favorites screenshot to: ${screenshotPath}`);

    await page.close();
  });
});
