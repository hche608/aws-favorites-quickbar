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
}
