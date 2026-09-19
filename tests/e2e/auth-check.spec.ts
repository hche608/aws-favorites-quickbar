import { test, expect } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';

test.describe('AWS Console Real Browser Authentication & Setup', () => {
  test('should launch browser with extension and verify AWS Console login', async ({
    page,
    extensionId
  }) => {
    console.log(`🔌 Loaded extension ID: ${extensionId || 'detected'}`);

    // Wait for human login or use existing active session
    await ensureAwsLoggedIn(page);

    // Verify we are on AWS Console home
    const currentUrl = page.url();
    expect(currentUrl).toContain('console.aws.amazon.com');

    console.log(`✅ Verified AWS Console URL: ${currentUrl}`);

    // If extension ID was retrieved, verify popup.html is accessible
    if (extensionId) {
      const popupPage = await page.context().newPage();
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
      const title = await popupPage.title();
      expect(title).toBe('AWS Favorites Quickbar');
      console.log(`✅ Extension popup successfully loaded with title: "${title}"`);
      await popupPage.close();
    }
  });
});
