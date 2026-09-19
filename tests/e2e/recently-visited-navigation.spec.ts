import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';
import { setE2EFavorites, waitForInjectionStatus, getE2EStorage } from './helpers/storage';

test.describe('Recently Visited & Multi-Service Navigation E2E Suite', () => {
  test('Case 1: Zero-pin user should see Recently Visited services with valid CDN icons (not placeholder)', async ({
    page,
    context,
    extensionId
  }) => {
    // 1. Simulate a user who has 0 pinned favorites
    await setE2EFavorites(context, extensionId, []);

    // 2. Open AWS Console home
    await ensureAwsLoggedIn(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 3. Wait for content script injection and element visibility
    const firstItem = page.locator('[data-service-id]').first();
    await expect(firstItem).toBeVisible({ timeout: 15_000 });

    // 4. Inspect injected quickbar items
    const injectedItems = page.locator('[data-service-id]');
    const count = await injectedItems.count();
    console.log(`\n📦 Discovered ${count} services in Quickbar for zero-pin user.`);
    expect(count).toBeGreaterThan(0);

    // 5. Verify URLs, order, and assert NO placeholder grayish-black icons
    for (let i = 0; i < count; i++) {
      const item = injectedItems.nth(i);
      const serviceId = await item.getAttribute('data-service-id');
      const href = await item.locator('a').getAttribute('href');
      const imgSrc = await item.locator('img').getAttribute('src');

      console.log(`Checking [${i}] service: "${serviceId}"`);
      console.log(`  🔗 Link: ${href}`);
      console.log(`  🖼️ Icon: ${imgSrc?.slice(0, 80)}...`);

      // Verify Rule 4 strict pattern
      expect(href).toMatch(new RegExp(`/${serviceId}/home`));

      // CRITICAL ASSERTION: Icon must NOT be the grayish-black placeholder icon!
      // Placeholder uses data:image/svg+xml with fill #879596 or #232F3E
      expect(imgSrc).not.toContain('data:image/svg+xml');
      expect(imgSrc).toMatch(/^https:\/\/[a-z0-9.-]+\.awsstatic\.com\//);
    }
  });

  test('Case 2: Quickbar persists across navigation from Console Home to S3 and EC2', async ({
    page,
    context,
    extensionId
  }) => {
    // 1. Start at Console Home to ensure cache is primed
    await ensureAwsLoggedIn(page);
    await waitForInjectionStatus(context, extensionId, 25_000);

    const homeItems = page.locator('[data-service-id]');
    const homeCount = await homeItems.count();
    expect(homeCount).toBeGreaterThan(0);

    // Capture IDs on Console Home
    const homeServiceIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-service-id]')).map((el) =>
        el.getAttribute('data-service-id')
      );
    });
    console.log('\n🏠 Console Home Quickbar services:', homeServiceIds);

    // 2. Navigate away to S3 Console (/s3/home)
    console.log('\n🚀 Navigating away from Home to S3 Console...');
    await page.goto('https://ap-southeast-2.console.aws.amazon.com/s3/home?region=ap-southeast-2', {
      waitUntil: 'domcontentloaded'
    });

    // Wait for Quickbar to inject from cached storage on S3 page
    await expect(page.locator('[data-service-id]').first()).toBeVisible({ timeout: 15_000 });

    const s3Items = page.locator('[data-service-id]');
    const s3Count = await s3Items.count();
    expect(s3Count).toBe(homeCount);

    const s3ServiceIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-service-id]')).map((el) =>
        el.getAttribute('data-service-id')
      );
    });
    console.log('🪣 S3 Console Quickbar services:', s3ServiceIds);
    expect(s3ServiceIds).toEqual(homeServiceIds);

    // Verify S3 navbar icons are real and visible
    for (let i = 0; i < s3Count; i++) {
      const item = s3Items.nth(i);
      const imgSrc = await item.locator('img').getAttribute('src');
      expect(imgSrc).not.toContain('data:image/svg+xml');
      expect(imgSrc).toMatch(/^https:\/\/[a-z0-9.-]+\.awsstatic\.com\//);
    }

    // 3. Navigate away to EC2 Console (/ec2/home)
    console.log('\n🚀 Navigating to EC2 Console...');
    await page.goto(
      'https://ap-southeast-2.console.aws.amazon.com/ec2/home?region=ap-southeast-2',
      { waitUntil: 'domcontentloaded' }
    );

    // Wait for Quickbar on EC2
    await expect(page.locator('[data-service-id]').first()).toBeVisible({ timeout: 15_000 });

    const ec2Items = page.locator('[data-service-id]');
    const ec2Count = await ec2Items.count();
    expect(ec2Count).toBe(homeCount);

    const ec2ServiceIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-service-id]')).map((el) =>
        el.getAttribute('data-service-id')
      );
    });
    console.log('💻 EC2 Console Quickbar services:', ec2ServiceIds);
    expect(ec2ServiceIds).toEqual(homeServiceIds);

    // Screenshot of quickbar in EC2 console
    await page.screenshot({ path: 'test-results/quickbar-ec2-page.png' });
    console.log('📸 Saved screenshot on EC2 sub-service page: test-results/quickbar-ec2-page.png');
  });
});
