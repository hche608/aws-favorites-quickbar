import { test, expect } from './fixtures';

/**
 * Common HTML template for mocking AWS console service pages in real Chromium
 */
function createAwsConsoleMockHtml(title: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { margin: 0; font-family: sans-serif; background: #0f141c; color: #fff; }
          header { height: 48px; background: #161e2e; display: flex; align-items: center; }
          ol { display: flex; list-style: none; margin: 0; padding: 0 10px; }
          li { margin-right: 8px; }
          a { color: #fff; text-decoration: none; display: flex; align-items: center; }
        </style>
      </head>
      <body>
        <header id="awsc-nav-header">
          <ol data-rbd-droppable-id="global-nav-favorites-bar-list-edit-mode">
            <li class="native-fav-item">
              <a class="native-fav-link" href="/ec2/home">
                <div class="native-main-container">
                  <div class="native-icon-wrapper">
                    <img class="native-icon" src="https://a.b.cdn.console.awsstatic.com/a/v1/HLWK65QMJM2I2JS7MFNDL3GYWYC7SUVMYOXC7I4RXZJ2LZVOHB4Q/icon/3918767c49f0151791236f3b99d1ce7c-13bf23cb4a6d38bb77b1a9030fe9d925.svg" />
                  </div>
                  <span class="native-label">EC2</span>
                </div>
              </a>
            </li>
          </ol>
        </header>
        <div data-testid="visualModeRadioGroup" style="display:none">
          <input type="radio" value="dark" checked />
          <input type="radio" value="light" />
        </div>
        <main>
          <h1>${title}</h1>
        </main>
      </body>
    </html>
  `;
}

/**
 * Real Browser E2E Test: Validating service icons and links for VPC and alias services
 */
test.describe('Real Browser Validation: Service Icons and Links', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 1. Prevent stale page-level fast-cache from leaking across tests
    await context.addInitScript(() => {
      try {
        window.localStorage.removeItem('awsFavoritesQuickbar_services');
      } catch {
        // Ignore in restricted contexts
      }
    });

    // 2. Set clean baseline in extension storage before each test runs
    const setupPage = await context.newPage();
    await setupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await setupPage.evaluate(async () => {
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set({
        userFavorites: ['ec2'],
        maxServices: 10,
        visualMode: 'dark'
      });
    });
    await setupPage.close();
  });

  test('Popup: Verifies real browser renders valid names, links, and non-broken CDN icons', async ({
    context,
    extensionId
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 650 });

    // 1. Open real extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('.service-item');

    // 2. Set test favorites including VPC, IAM, WAF, Step Functions, OpenSearch, etc.
    const testServiceIds = [
      'vpc',
      'iam',
      'wafv2-pro',
      'states',
      'aos',
      'dynamodbv2',
      'redshiftv2',
      'systems-manager'
    ];

    await page.evaluate(async (ids) => {
      await chrome.storage.local.clear();
      await chrome.storage.sync.set({
        userFavorites: ids,
        maxServices: 15
      });
    }, testServiceIds);

    // Reload popup to display new favorites
    await page.reload();
    await page.waitForSelector('.service-item');

    // 3. Expected metadata for verified services
    const expectedServices: Record<string, { name: string; id: string }> = {
      vpc: { id: 'vpc', name: 'VPC' },
      iam: { id: 'iam', name: 'IAM' },
      'wafv2-pro': { id: 'wafv2-pro', name: 'WAF & Shield' },
      states: { id: 'states', name: 'Step Functions' },
      aos: { id: 'aos', name: 'OpenSearch' },
      dynamodbv2: { id: 'dynamodbv2', name: 'DynamoDB' },
      redshiftv2: { id: 'redshiftv2', name: 'Amazon Redshift' },
      'systems-manager': { id: 'systems-manager', name: 'Systems Manager' }
    };

    for (const [serviceId, expected] of Object.entries(expectedServices)) {
      const item = page.locator(`.service-item[data-service-id="${serviceId}"]`);
      await expect(item).toBeVisible({ timeout: 5000 });

      // Verify display name
      const nameEl = item.locator('.service-name');
      await expect(nameEl).toContainText(expected.name);

      // Verify icon image element
      const img = item.locator('.service-icon');
      await expect(img).toBeVisible();

      const src = await img.getAttribute('src');
      expect(src).not.toBeNull();
      expect(src).toContain('cdn.console.awsstatic.com');
      expect(src).toContain('.svg');

      // Verify image is actually loaded by the real browser (network HTTP 200 and decoded)
      const isLoaded = await img.evaluate((el: HTMLImageElement) => {
        return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
      });
      expect(isLoaded, `Icon for ${serviceId} should be successfully loaded over network`).toBe(
        true
      );
    }

    // Capture visual confirmation screenshot of real browser popup
    await page.screenshot({ path: 'test-results/real-browser-popup-services.png' });
    console.log(
      '📸 Real browser popup screenshot saved: test-results/real-browser-popup-services.png'
    );
    await page.close();
  });

  test('AWS Console Page: Verifies visiting /vpcconsole/home captures "VPC" name and valid CDN icon', async ({
    context
  }) => {
    // Intercept AWS console URL for /vpcconsole/home
    await context.route(
      'https://ap-southeast-2.console.aws.amazon.com/vpcconsole/home*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: createAwsConsoleMockHtml('Your Virtual Private Clouds')
        });
      }
    );

    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to VPC console in real browser
    await page.goto(
      'https://ap-southeast-2.console.aws.amazon.com/vpcconsole/home?region=ap-southeast-2',
      { waitUntil: 'domcontentloaded' }
    );

    // Content script runs in real browser: wait for injected quickbar item for VPC
    const vpcQuickbarItem = page.locator('li[data-service-id="vpc"]');
    await expect(vpcQuickbarItem).toBeVisible({ timeout: 10_000 });

    // Verify injected label is 'VPC' (not 'Vpcconsole')
    const vpcLabel = vpcQuickbarItem.locator('span');
    await expect(vpcLabel).toHaveText('VPC');

    // Verify injected link points to valid VPC console
    const vpcAnchor = vpcQuickbarItem.locator('a');
    const href = await vpcAnchor.getAttribute('href');
    expect(href).not.toBeNull();
    expect(href).toContain('/vpc/home');

    // Verify injected icon uses official SVG CDN and actually renders in browser
    const vpcIcon = vpcQuickbarItem.locator('img');
    await expect(vpcIcon).toBeVisible();

    const iconSrc = await vpcIcon.getAttribute('src');
    expect(iconSrc).toContain('cdn.console.awsstatic.com');
    expect(iconSrc).toContain('.svg');

    const iconLoaded = await vpcIcon.evaluate((el: HTMLImageElement) => {
      return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
    });
    expect(iconLoaded, 'VPC icon must render with positive width and height in real browser').toBe(
      true
    );

    // Capture visual confirmation of real browser with injected VPC Quickbar
    await page.screenshot({ path: 'test-results/real-browser-vpc-mounted.png' });
    console.log('📸 Real browser VPC screenshot saved: test-results/real-browser-vpc-mounted.png');
    await page.close();
  });

  test('AWS Console Page: Verifies /iamv2/home and /stepfunctions/home capture correct names & icons', async ({
    context
  }) => {
    // 1. Intercept IAM modern console (/iamv2/home)
    await context.route('https://ap-southeast-2.console.aws.amazon.com/iamv2/home*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: createAwsConsoleMockHtml('IAM Dashboard')
      });
    });

    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto(
      'https://ap-southeast-2.console.aws.amazon.com/iamv2/home?region=ap-southeast-2',
      { waitUntil: 'domcontentloaded' }
    );

    const iamItem = page.locator('li[data-service-id="iam"]');
    await expect(iamItem).toBeVisible({ timeout: 10_000 });
    await expect(iamItem.locator('span')).toHaveText('IAM');

    const iamIcon = iamItem.locator('img');
    const iamSrc = await iamIcon.getAttribute('src');
    expect(iamSrc).toContain('cdn.console.awsstatic.com');
    const iamLoaded = await iamIcon.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(iamLoaded).toBe(true);

    // 2. Test Step Functions console (/stepfunctions/home)
    await context.route(
      'https://ap-southeast-2.console.aws.amazon.com/stepfunctions/home*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: createAwsConsoleMockHtml('Step Functions')
        });
      }
    );

    await page.goto(
      'https://ap-southeast-2.console.aws.amazon.com/stepfunctions/home?region=ap-southeast-2',
      { waitUntil: 'domcontentloaded' }
    );

    const statesItem = page.locator('li[data-service-id="states"]');
    await expect(statesItem).toBeVisible({ timeout: 10_000 });
    await expect(statesItem.locator('span')).toHaveText('Step Functions');

    const statesIcon = statesItem.locator('img');
    const statesSrc = await statesIcon.getAttribute('src');
    expect(statesSrc).toContain('cdn.console.awsstatic.com');
    const statesLoaded = await statesIcon.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    );
    expect(statesLoaded).toBe(true);

    await page.close();
  });
});
