import { BrowserContext } from '@playwright/test';

/**
 * Injects a deterministic list of user favorite service IDs into extension storage.
 */
export async function setE2EFavorites(
  context: BrowserContext,
  extensionId: string,
  favorites: string[]
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.evaluate(async (favs) => {
    await chrome.storage.sync.set({ userFavorites: favs });
  }, favorites);

  await page.close();
}

/**
 * Injects a list of cached services into local storage for testing popup UI.
 */
export async function setE2ECachedServices(
  context: BrowserContext,
  extensionId: string,
  services: any[]
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.evaluate(async (svcs) => {
    await chrome.storage.local.set({
      cachedServices: {
        services: svcs,
        timestamp: Date.now()
      }
    });
  }, services);

  await page.close();
}

/**
 * Retrieves all items from extension storage ('sync' or 'local').
 */
export async function getE2EStorage(
  context: BrowserContext,
  extensionId: string,
  area: 'sync' | 'local' = 'sync'
): Promise<Record<string, any>> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const data = await page.evaluate(async (storageArea) => {
    return await chrome.storage[storageArea].get(null);
  }, area);

  await page.close();
  return data;
}

/**
 * Waits for injectionStatus to be set in local storage by the content script.
 * Uses a single page instance for the entire polling loop to reduce overhead.
 */
export async function waitForInjectionStatus(
  context: BrowserContext,
  extensionId: string,
  timeoutMs: number = 20_000
): Promise<string> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const startTime = Date.now();
  let result = '';
  while (Date.now() - startTime < timeoutMs) {
    const data = await page.evaluate(async () => {
      return await chrome.storage.local.get('injectionStatus');
    });
    if (data?.injectionStatus) {
      result = data.injectionStatus;
      break;
    }
    await page.waitForTimeout(1000);
  }

  await page.close();
  return result;
}
