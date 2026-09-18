import { chromium } from '@playwright/test';
import path from 'path';
import { ensureNativeConsoleHomePinned } from '../tests/e2e/helpers/auth';

/**
 * Interactive login helper for AWS Console E2E testing.
 * Keeps browser open without test timeouts until human login + Passkey/MFA is completed.
 */
async function main() {
  const pathToExtension = path.resolve(process.cwd(), 'dist/chrome');
  const userDataDir = path.resolve(process.cwd(), '.e2e-profile/chrome');

  console.log('🚀 Launching real Chrome for AWS login...');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const page = context.pages()[0] || (await context.newPage());
  console.log('🌐 Navigating to https://console.aws.amazon.com/ ...');
  await page.goto('https://console.aws.amazon.com/');

  console.log('\n=============================================================');
  console.log('👉 Please complete your password & Passkey / Security Key MFA.');
  console.log('⏳ This helper will automatically detect when you reach /home.');
  console.log('=============================================================\n');

  while (!page.isClosed()) {
    try {
      const url = page.url();
      if (
        url.includes('console.aws.amazon.com') &&
        (url.includes('/home') || url.includes('region=')) &&
        !url.includes('/signin') &&
        !url.includes('/auth')
      ) {
        console.log('🎉 Login detected successfully!');
        console.log(`📍 Current URL: ${url}`);

        // Automatically ensure Rule 3 prerequisite: Pin "Console Home" natively
        await ensureNativeConsoleHomePinned(page);

        console.log('💾 Session saved to .e2e-profile/chrome');
        break;
      }
    } catch {
      // Ignore transient errors while navigating
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log('\nClosing browser in 3 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await context.close();
  console.log('✅ Test environment is ready! You can now run "npm run test:e2e".');
}

main().catch(console.error);
