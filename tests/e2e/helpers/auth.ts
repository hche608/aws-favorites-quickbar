import { Page } from '@playwright/test';

/**
 * Checks if the page is currently logged into AWS Console.
 * If not, prompts the user in terminal and waits for human login and MFA.
 */
export async function ensureAwsLoggedIn(page: Page, timeoutMs = 60_000): Promise<void> {
  console.log('🔍 Navigating to AWS Console...');
  await page.goto('https://console.aws.amazon.com/');

  const isAlreadyHome = () => {
    const url = page.url();
    return (
      url.includes('console.aws.amazon.com') &&
      (url.includes('/home') || url.includes('region=')) &&
      !url.includes('/signin') &&
      !url.includes('/auth')
    );
  };

  if (isAlreadyHome()) {
    console.log('✅ Already logged in to AWS Console.');
    await page.waitForLoadState('domcontentloaded');
    await ensureNativeConsoleHomePinned(page);
    return;
  }

  console.log('\n===============================================================');
  console.log('⚠️  AWS Console login required!');
  console.log('👉  Please complete quick MFA / Touch ID in the opened browser.');
  console.log(`⏳  Waiting for redirect to console home (up to ${timeoutMs / 1000}s)...`);
  console.log('💡  Tip: Run "npm run test:e2e:login" if you need unlimited time.');
  console.log('===============================================================\n');

  const startTime = Date.now();
  let loggedIn = false;

  while (Date.now() - startTime < timeoutMs) {
    if (page.isClosed()) {
      throw new Error('Browser window was closed before login was completed.');
    }

    try {
      const href = page.url();
      if (
        href.includes('console.aws.amazon.com') &&
        (href.includes('/home') || href.includes('region=')) &&
        !href.includes('/signin') &&
        !href.includes('/auth')
      ) {
        loggedIn = true;
        break;
      }
    } catch {
      // Ignore transient errors while navigating
    }

    await page.waitForTimeout(1500);
  }

  if (!loggedIn) {
    throw new Error(
      `Timed out waiting for AWS login after ${timeoutMs / 1000}s.\n👉 Tip: Run "npm run test:e2e:login" to authenticate interactively first.`
    );
  }

  console.log('🎉 Successfully detected AWS Console home page! Continuing test...');
  try {
    await page.waitForLoadState('domcontentloaded');
  } catch {
    // Ignore load state errors if already loaded
  }
  await ensureNativeConsoleHomePinned(page);
}

/**
 * Ensures that AWS "Console Home" is pinned natively in the AWS Console navbar.
 * Per Rule 3 of AGENTS.md, at least 1 native pinned service must exist in the navbar
 * for the extension to dynamically extract CSS classes.
 * This helper searches "Console Home" in the top navbar and clicks its star button if unpinned.
 */
export async function ensureNativeConsoleHomePinned(page: Page): Promise<void> {
  const hasNativePin = await page.evaluate(() => {
    const quickbar = document.querySelector(
      'ol[data-rbd-droppable-id*="favorites"], ol[class*="favorites"], [data-testid="favorites-bar-list"]'
    );
    return quickbar && quickbar.querySelectorAll('li:not([data-source])').length > 0;
  });

  if (hasNativePin) {
    console.log('✅ Native pinned service (Console Home) is already present in navbar.');
    return;
  }

  console.log('🔍 Native pin missing. Auto-pinning "Console Home" via AWS Search...');
  const searchInput = page
    .locator(
      'input[data-testid="awsc-concierge-input"], #awsc-concierge-input, input[placeholder*="Search"]'
    )
    .first();

  await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
  await searchInput.click();
  await searchInput.fill('Console Home');

  const pinButton = page
    .locator('button[data-testid="service-list-item-toggle-favorite-button-home"]')
    .last();
  await pinButton.waitFor({ state: 'visible', timeout: 8_000 });

  const ariaLabel = (await pinButton.getAttribute('aria-label')) || '';
  if (ariaLabel.toLowerCase().includes('add')) {
    console.log('⭐ Pinning "Console Home" natively...');
    await pinButton.click();
    await page.waitForTimeout(1000);
  }

  // Close search overlay
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  console.log('🎉 "Console Home" successfully pinned natively!');
}
