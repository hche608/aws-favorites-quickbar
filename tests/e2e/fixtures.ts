import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';

export interface TestFixtures {
  context: BrowserContext;
  page: Page;
  extensionId: string;
}

export const test = base.extend<TestFixtures>({
  context: async ({}, use) => {
    const pathToExtension = path.resolve(process.cwd(), 'dist/chrome');
    const userDataDir = path.resolve(process.cwd(), '.e2e-profile/chrome');

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await use(page);
  },

  extensionId: async ({ context }, use) => {
    // Navigate to chrome://extensions to inspect loaded extension ID
    const extPage = await context.newPage();
    await extPage.goto('chrome://extensions');
    const id = await extPage.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      const itemList = manager?.shadowRoot?.querySelector('extensions-item-list');
      const items = itemList?.shadowRoot?.querySelectorAll('extensions-item');
      if (!items || items.length === 0) return '';
      return (items[0] as any).id || '';
    });
    await extPage.close();
    await use(id);
  }
});

export const expect = test.expect;
