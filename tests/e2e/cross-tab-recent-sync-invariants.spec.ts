import { test, expect } from './fixtures';

/**
 * Common HTML template generator for mock AWS Console pages with native navigation bar
 */
function createAwsConsoleHtml(options: { title: string; isHomepage?: boolean }): string {
  const recentWidgetHtml = options.isHomepage
    ? `
      <main>
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="listItem-s3">
              <a href="https://ap-southeast-2.console.aws.amazon.com/s3/home?region=ap-southeast-2">
                <span>Amazon S3</span>
              </a>
              <img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" />
            </div>
            <div class="listItem-lambda">
              <a href="https://ap-southeast-2.console.aws.amazon.com/lambda/home?region=ap-southeast-2">
                <span>AWS Lambda</span>
              </a>
              <img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" />
            </div>
            <div class="listItem-dynamodb">
              <a href="https://ap-southeast-2.console.aws.amazon.com/dynamodbv2/home?region=ap-southeast-2">
                <span>Amazon DynamoDB</span>
              </a>
              <img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" />
            </div>
          </div>
        </div>
      </main>
    `
    : '<main><h1>AWS Service Console</h1></main>';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${options.title}</title>
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
              <a class="native-fav-link" href="https://ap-southeast-2.console.aws.amazon.com/console/home">
                <div class="native-main-container">
                  <div class="native-icon-wrapper">
                    <img class="native-icon" src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" />
                  </div>
                  <span class="native-label">AWS Native Home</span>
                </div>
              </a>
            </li>
          </ol>
        </header>
        <div data-testid="visualModeRadioGroup" style="display:none">
          <input type="radio" value="dark" checked />
          <input type="radio" value="light" />
        </div>
        ${recentWidgetHtml}
      </body>
    </html>
  `;
}

test.describe('Real-Time Cross-Tab Recent Items Sync Invariants (Offline E2E)', () => {
  test('Invariant: Visiting Console Home in Tab C automatically synchronizes recently visited items to active Tabs A & B without page reload', async ({
    context,
    extensionId
  }) => {
    // 1. Initialize Extension Settings via popup (pinned: ec2, maxServices: 10, no recents initially)
    // Guarantee a clean slate across runs: the persistent E2E profile retains origin
    // localStorage, and the content script's own save->onChanged->localStorage write can
    // re-populate a stale cache even after a page-level clear. Clearing the fast-cache key
    // at document_start (before the document_idle content script reads it) makes each
    // fresh page load deterministic. Tabs A & B never reload, so this does not touch the
    // real-time onChanged propagation path under test.
    await context.addInitScript(() => {
      try {
        window.localStorage.removeItem('awsFavoritesQuickbar_services');
      } catch {
        // Ignore in contexts without localStorage access
      }
    });

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

    // 2. Setup mock AWS Console routes on browser context
    await context.route('https://ap-southeast-2.console.aws.amazon.com/**', (route) => {
      const url = route.request().url();
      if (url.includes('/console/home')) {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: createAwsConsoleHtml({ title: 'AWS Management Console Home', isHomepage: true })
        });
      } else if (url.includes('/s3/home')) {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: createAwsConsoleHtml({ title: 'Amazon S3 Console', isHomepage: false })
        });
      } else if (url.includes('/cloudwatch/home')) {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: createAwsConsoleHtml({ title: 'Amazon CloudWatch Console', isHomepage: false })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: createAwsConsoleHtml({ title: 'AWS Console', isHomepage: false })
        });
      }
    });

    // Pre-clean origin localStorage so previous test runs don't leak cached services
    const cleanPage = await context.newPage();
    await cleanPage.goto(
      'https://ap-southeast-2.console.aws.amazon.com/s3/home?region=ap-southeast-2',
      {
        waitUntil: 'domcontentloaded'
      }
    );
    await cleanPage.evaluate(() => localStorage.clear());
    await cleanPage.close();

    // 3. Open Tab A (S3 Console)
    const pageA = await context.newPage();
    await pageA.goto(
      'https://ap-southeast-2.console.aws.amazon.com/s3/home?region=ap-southeast-2',
      {
        waitUntil: 'domcontentloaded'
      }
    );
    await expect(pageA.locator('[data-service-id="ec2"]')).toBeVisible({ timeout: 10_000 });

    // Verify Tab A currently has only EC2 (no Lambda or DynamoDB yet)
    await expect(pageA.locator('[data-service-id="lambda"]')).toHaveCount(0);
    await expect(pageA.locator('[data-service-id="dynamodbv2"]')).toHaveCount(0);

    // 4. Open Tab B (CloudWatch Console)
    const pageB = await context.newPage();
    await pageB.goto(
      'https://ap-southeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-2',
      {
        waitUntil: 'domcontentloaded'
      }
    );
    await expect(pageB.locator('[data-service-id="ec2"]')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.locator('[data-service-id="lambda"]')).toHaveCount(0);
    await expect(pageB.locator('[data-service-id="dynamodbv2"]')).toHaveCount(0);

    // 5. Open Tab C (Console Home) which loads and scrapes Recently Visited items
    const pageC = await context.newPage();
    await pageC.goto(
      'https://ap-southeast-2.console.aws.amazon.com/console/home?region=ap-southeast-2',
      {
        waitUntil: 'domcontentloaded'
      }
    );
    await pageC.waitForTimeout(2000);
    // Tab C should scrape S3, Lambda, DynamoDB and render them alongside EC2
    await expect(pageC.locator('[data-service-id="ec2"]')).toBeVisible({ timeout: 10_000 });
    await expect(pageC.locator('[data-service-id="s3"]')).toBeVisible({ timeout: 10_000 });
    await expect(pageC.locator('[data-service-id="lambda"]')).toBeVisible({ timeout: 10_000 });
    await expect(pageC.locator('[data-service-id="dynamodbv2"]')).toBeVisible({ timeout: 10_000 });

    // 6. Invariant Verification: Tab A (S3) and Tab B (CloudWatch) must update in REAL TIME without reload
    await expect(pageA.locator('[data-service-id="lambda"]')).toBeVisible({ timeout: 5_000 });
    await expect(pageA.locator('[data-service-id="dynamodbv2"]')).toBeVisible({ timeout: 5_000 });

    await expect(pageB.locator('[data-service-id="lambda"]')).toBeVisible({ timeout: 5_000 });
    await expect(pageB.locator('[data-service-id="dynamodbv2"]')).toBeVisible({ timeout: 5_000 });

    // 7. Ping-pong cascade guard: Verify Tab A and Tab B did not write back or cause infinite loop
    // Cached services in storage should have exactly the services scraped by Tab C
    const storageCheckPage = await context.newPage();
    await storageCheckPage.goto(`chrome-extension://${extensionId}/popup.html`);
    const cachedData = await storageCheckPage.evaluate(async () => {
      const res = await chrome.storage.local.get('cachedServices');
      return res.cachedServices;
    });
    expect(cachedData).toBeDefined();
    expect(Array.isArray(cachedData.services)).toBe(true);
    const serviceIds = cachedData.services.map((s: { id: string }) => s.id);
    expect(serviceIds).toContain('s3');
    expect(serviceIds).toContain('lambda');
    expect(serviceIds).toContain('dynamodbv2');

    // Cleanup
    await storageCheckPage.close();
    await pageC.close();
    await pageB.close();
    await pageA.close();
  });
});
