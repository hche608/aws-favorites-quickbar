import { test, expect } from './fixtures';
import { getRealServices } from '../helpers/real-services';

const ALL_SERVICES = getRealServices();

test.describe('Popup Layout Invariants & Overflow Prevention (Code-based UI E2E)', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // Populate storage with mock services without requiring AWS network/login
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(async (svcs) => {
      await chrome.storage.local.set({
        cachedServices: { services: svcs, timestamp: Date.now() }
      });
      await chrome.storage.sync.set({
        userFavorites: ['s3', 'ec2', 'lambda', 'iam', 'dynamodbv2'],
        maxServices: 10,
        visualMode: 'dark',
        enableCodePipelineHoverPreview: true,
        codePipelineHoverDelayMs: 1000
      });
    }, ALL_SERVICES);
    await page.close();
  });

  test('Invariant 1: Zero Horizontal Overflow in standard popup viewport (420x590)', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 590 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('.service-item');

    // Test both Dark and Light themes
    for (const theme of ['dark', 'light'] as const) {
      const modeSelect = page.locator('#visualModeSelect');
      await modeSelect.selectOption(theme);
      await page.waitForTimeout(100);

      // Invariant A: Page document and body must have zero scroll overflow
      const pageMetrics = await page.evaluate(() => ({
        htmlScrollWidth: document.documentElement.scrollWidth,
        htmlClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth
      }));

      expect(
        pageMetrics.htmlScrollWidth,
        `HTML scrollWidth should not exceed clientWidth in ${theme} theme`
      ).toBeLessThanOrEqual(pageMetrics.htmlClientWidth + 1);

      expect(
        pageMetrics.bodyScrollWidth,
        `Body scrollWidth should not exceed clientWidth in ${theme} theme`
      ).toBeLessThanOrEqual(pageMetrics.bodyClientWidth + 1);

      // Invariant B: Not a single element in the DOM tree may exceed viewport right border
      const overflowingElements = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const issues: string[] = [];
        const allElements = Array.from(document.querySelectorAll('*'));

        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          // Check visible elements only
          if (rect.width > 0 && rect.height > 0) {
            if (rect.right > viewportWidth + 1) {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const cls =
                el.className && typeof el.className === 'string'
                  ? `.${el.className.split(' ').join('.')}`
                  : '';
              issues.push(
                `${tag}${id}${cls} (right: ${Math.round(rect.right)}px, max allowed: ${viewportWidth}px)`
              );
            }
          }
        }
        return issues;
      });

      expect(
        overflowingElements,
        `Found elements exceeding right boundary in ${theme} theme: ${overflowingElements.join('; ')}`
      ).toEqual([]);
    }

    await page.close();
  });

  test('Invariant 2: Settings toolbar must use non-overlapping 2-row layout with clear spacing', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 590 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('.settings-toolbar');

    const toolbar = page.locator('.settings-toolbar');
    await expect(toolbar).toBeVisible();

    const rows = toolbar.locator('.settings-row');
    await expect(rows).toHaveCount(2);

    // Verify Row 1: Quickbar Limit (left) and Theme (right) do not overlap
    const maxServicesInput = page.locator('#maxServicesInput');
    const visualModeSelect = page.locator('#visualModeSelect');
    const inputRect = await maxServicesInput.boundingBox();
    const modeRect = await visualModeSelect.boundingBox();

    expect(inputRect).not.toBeNull();
    expect(modeRect).not.toBeNull();
    if (inputRect && modeRect) {
      expect(inputRect.x + inputRect.width).toBeLessThan(modeRect.x);
      expect(Math.abs(inputRect.y - modeRect.y)).toBeLessThan(10);
    }

    // Verify Row 2: CodePipeline Preview (left) and Delay (right) do not overlap
    const pipelineCheckbox = page.locator('#codePipelineHoverInput');
    const delaySelect = page.locator('#hoverDelaySelect');
    const pipeRect = await pipelineCheckbox.boundingBox();
    const delayRect = await delaySelect.boundingBox();

    expect(pipeRect).not.toBeNull();
    expect(delayRect).not.toBeNull();
    if (pipeRect && delayRect) {
      expect(pipeRect.x + pipeRect.width).toBeLessThan(delayRect.x);
      expect(Math.abs(pipeRect.y - delayRect.y)).toBeLessThan(10);
    }

    // Verify Row 1 is strictly above Row 2
    if (inputRect && pipeRect) {
      expect(inputRect.y + inputRect.height).toBeLessThanOrEqual(pipeRect.y);
    }

    await page.close();
  });

  test('Invariant 3: Toggling CodePipeline Preview updates Delay container interactive state', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 590 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('#codePipelineHoverInput');

    const checkbox = page.locator('#codePipelineHoverInput');
    const delayContainer = page.locator('#hoverDelayContainer');

    // Initially checked
    await expect(checkbox).toBeChecked();
    await expect(delayContainer).not.toHaveClass(/disabled/);

    // Uncheck
    await checkbox.uncheck();
    await page.waitForTimeout(250);
    await expect(delayContainer).toHaveClass(/disabled/);

    const disabledStyles = await delayContainer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        pointerEvents: style.pointerEvents,
        opacity: parseFloat(style.opacity)
      };
    });

    expect(disabledStyles.pointerEvents).toBe('none');
    expect(disabledStyles.opacity).toBeLessThan(0.6);

    // Check again
    await checkbox.check();
    await page.waitForTimeout(250);
    await expect(delayContainer).not.toHaveClass(/disabled/);

    const enabledStyles = await delayContainer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        pointerEvents: style.pointerEvents,
        opacity: parseFloat(style.opacity)
      };
    });

    expect(enabledStyles.pointerEvents).toBe('auto');
    expect(enabledStyles.opacity).toBe(1);

    await page.close();
  });

  test('Invariant 4: Empty state informs user of native AWS Console pin prerequisite with zero overflow', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 590 });

    // Set 0 user favorites to trigger empty state
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(async () => {
      await chrome.storage.sync.set({ userFavorites: [] });
    });
    await page.reload();
    await page.waitForSelector('#emptyState');

    const emptyState = page.locator('#emptyState');
    await expect(emptyState).toBeVisible();
    await expect(emptyState.locator('.state-title')).toHaveText('Native AWS Console Pin Required');
    await expect(emptyState.locator('.hint')).toContainText(
      'pin at least one service in the AWS Console navbar'
    );

    // Verify zero overflow in both dark and light themes with empty state displayed
    for (const theme of ['dark', 'light'] as const) {
      const modeSelect = page.locator('#visualModeSelect');
      await modeSelect.selectOption(theme);
      await page.waitForTimeout(100);

      const metrics = await page.evaluate(() => ({
        htmlScrollWidth: document.documentElement.scrollWidth,
        htmlClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth
      }));

      expect(metrics.htmlScrollWidth).toBeLessThanOrEqual(metrics.htmlClientWidth + 1);
      expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth + 1);
    }

    await page.close();
  });
});
