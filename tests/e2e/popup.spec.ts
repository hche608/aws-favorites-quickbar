import { test, expect } from './fixtures';
import { setE2EFavorites, setE2ECachedServices, getE2EStorage } from './helpers/storage';
import { getRealServices } from '../helpers/real-services';

const ALL_SERVICES = getRealServices();

test.describe('Popup UI & Interaction E2E Suite', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Seed storage with known services and initial favorites
    await setE2ECachedServices(context, extensionId, ALL_SERVICES);
    await setE2EFavorites(context, extensionId, ['s3', 'ec2']);
  });

  test('should render cached services and mark initial favorites as selected', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify service items are rendered
    const items = page.locator('.service-item');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(20);

    // Verify initial favorites ('s3', 'ec2') are marked selected
    const s3Item = page.locator('.service-item[data-service-id="s3"]');
    const ec2Item = page.locator('.service-item[data-service-id="ec2"]');
    await expect(s3Item).toHaveClass(/selected/);
    await expect(ec2Item).toHaveClass(/selected/);

    const s3Checkbox = s3Item.locator('input[type="checkbox"]');
    expect(await s3Checkbox.isChecked()).toBe(true);

    // Verify unselected service
    const lambdaItem = page.locator('.service-item[data-service-id="lambda"]');
    await expect(lambdaItem).not.toHaveClass(/selected/);
    const lambdaCheckbox = lambdaItem.locator('input[type="checkbox"]');
    expect(await lambdaCheckbox.isChecked()).toBe(false);

    await page.close();
  });

  test('should filter services in real time when typing in searchInput', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const searchInput = page.locator('#searchInput');
    await expect(searchInput).toBeVisible();

    // Type query matching DynamoDB
    await searchInput.fill('Dynamo');
    await page.waitForTimeout(300);

    // Verify only matched service(s) are visible
    const dynamoItem = page.locator('.service-item[data-service-id="dynamodbv2"]');
    await expect(dynamoItem).toBeVisible();

    // Unmatched services should not be in the filtered list
    const s3Item = page.locator('.service-item[data-service-id="s3"]');
    expect(await s3Item.count()).toBe(0);

    // Clear search and verify full list is restored
    await searchInput.fill('');
    await page.waitForTimeout(300);
    const restoredItems = page.locator('.service-item');
    expect(await restoredItems.count()).toBeGreaterThanOrEqual(20);

    await page.close();
  });

  test('should pin and unpin services and persist immediately to storage.sync', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // 1. Pin a new service: 'lambda'
    const lambdaItem = page.locator('.service-item[data-service-id="lambda"]');
    await lambdaItem.click();
    await expect(lambdaItem).toHaveClass(/selected/);

    // Verify persisted in storage.sync
    let syncData = await getE2EStorage(context, extensionId, 'sync');
    expect(syncData.userFavorites).toContain('lambda');

    // 2. Unpin 's3'
    const s3Item = page.locator('.service-item[data-service-id="s3"]');
    await s3Item.click();
    await expect(s3Item).not.toHaveClass(/selected/);

    // Verify removed from storage.sync
    syncData = await getE2EStorage(context, extensionId, 'sync');
    expect(syncData.userFavorites).not.toContain('s3');
    expect(syncData.userFavorites).toContain('ec2');
    expect(syncData.userFavorites).toContain('lambda');

    await page.close();
  });

  test('should support drag-and-drop reordering of pinned favorites', async ({
    context,
    extensionId
  }) => {
    // Setup 3 pinned favorites: ['s3', 'ec2', 'lambda']
    await setE2EFavorites(context, extensionId, ['s3', 'ec2', 'lambda']);

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Trigger drag-and-drop: drag 'lambda' onto 's3'
    await page.evaluate(() => {
      const fromEl = document.querySelector('[data-service-id="lambda"]') as HTMLElement;
      const toEl = document.querySelector('[data-service-id="s3"]') as HTMLElement;
      if (!fromEl || !toEl) throw new Error('Elements not found for drag');

      fromEl.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true }));
      toEl.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
      toEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));
      toEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
      fromEl.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true }));
    });

    await page.waitForTimeout(500);

    // Verify new order in storage.sync is ['lambda', 's3', 'ec2']
    const syncData = await getE2EStorage(context, extensionId, 'sync');
    expect(syncData.userFavorites[0]).toBe('lambda');
    expect(syncData.userFavorites[1]).toBe('s3');
    expect(syncData.userFavorites[2]).toBe('ec2');

    // Reload popup and verify DOM order matches the new order
    await page.reload();
    const firstItem = page.locator('.service-item.selected').first();
    const firstId = await firstItem.getAttribute('data-service-id');
    expect(firstId).toBe('lambda');

    await page.close();
  });

  test('should update maxServices and visualMode settings in storage.sync', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Update maxServices
    const maxInput = page.locator('#maxServicesInput');
    await maxInput.fill('15');
    await maxInput.dispatchEvent('change');
    await page.waitForTimeout(300);

    let syncData = await getE2EStorage(context, extensionId, 'sync');
    expect(syncData.maxServices).toBe(15);

    // Update visualMode
    const modeSelect = page.locator('#visualModeSelect');
    await modeSelect.selectOption('light');
    await modeSelect.dispatchEvent('change');
    await page.waitForTimeout(300);

    syncData = await getE2EStorage(context, extensionId, 'sync');
    expect(syncData.visualMode).toBe('light');

    await page.close();
  });
});
