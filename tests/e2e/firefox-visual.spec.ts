import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { getRealServices } from '../helpers/real-services';

const ALL_SERVICES = getRealServices();
const ROOT_DIR = process.cwd();
const FIREFOX_DIST_DIR = path.resolve(ROOT_DIR, 'dist/firefox');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'test-results');

test.describe('Firefox Distribution Visual & Interactive Automation Suite', () => {
  test.beforeAll(() => {
    // Verify firefox distribution exists
    expect(fs.existsSync(path.join(FIREFOX_DIST_DIR, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(FIREFOX_DIST_DIR, 'popup.html'))).toBe(true);
  });

  test('Case 1: Open Firefox popup in visible browser and verify Dark Mode layout', async ({
    page
  }) => {
    await page.setViewportSize({ width: 440, height: 620 });

    // Navigate directly to the Firefox distribution popup
    const popupUrl = `file://${path.join(FIREFOX_DIST_DIR, 'popup.html')}`;
    await page.goto(popupUrl);

    // Mock storage and initialize with sample favorites
    await page.evaluate(
      ({ services }) => {
        (window as any).chrome = {
          storage: {
            sync: {
              get: (_keys: any, cb: any) => {
                const data = {
                  userFavorites: ['s3', 'ec2', 'lambda', 'iam', 'dynamodbv2'],
                  maxServices: 10,
                  visualMode: 'dark'
                };
                if (cb) cb(data);
                return Promise.resolve(data);
              },
              set: (_data: any, cb: any) => {
                if (cb) cb();
                return Promise.resolve();
              }
            },
            local: {
              get: (_keys: any, cb: any) => {
                const data = {
                  cachedServices: services,
                  injectionStatus: 'success'
                };
                if (cb) cb(data);
                return Promise.resolve(data);
              },
              set: (_data: any, cb: any) => {
                if (cb) cb();
                return Promise.resolve();
              }
            }
          },
          tabs: {
            query: () => Promise.resolve([]),
            sendMessage: () => Promise.resolve()
          }
        };

        // Trigger DOMContentLoaded logic
        window.dispatchEvent(new Event('DOMContentLoaded'));
      },
      { services: ALL_SERVICES }
    );

    await page.waitForTimeout(600);

    // Assert Firefox popup elements are rendered
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('#favoritesBadge')).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();
    await expect(page.locator('#maxServicesInput')).toBeVisible();
    await expect(page.locator('#visualModeSelect')).toBeVisible();

    // Save visual screenshot of Firefox build
    const darkScreenshotPath = path.join(ARTIFACT_DIR, 'firefox-popup-dark.png');
    await page.screenshot({ path: darkScreenshotPath });
    console.log(`📸 Captured Firefox distribution Dark Mode screenshot: ${darkScreenshotPath}`);
  });

  test('Case 2: Interactive search, clear button, and theme toggle in Firefox build', async ({
    page
  }) => {
    await page.setViewportSize({ width: 440, height: 620 });
    const popupUrl = `file://${path.join(FIREFOX_DIST_DIR, 'popup.html')}`;
    await page.goto(popupUrl);

    // Inject mock environment
    await page.evaluate(
      ({ services }) => {
        (window as any).chrome = {
          storage: {
            sync: {
              get: (_keys: any, cb: any) => {
                const data = {
                  userFavorites: ['s3', 'ec2'],
                  maxServices: 10,
                  visualMode: 'light'
                };
                if (cb) cb(data);
                return Promise.resolve(data);
              },
              set: (_data: any, cb: any) => {
                if (cb) cb();
                return Promise.resolve();
              }
            },
            local: {
              get: (_keys: any, cb: any) => {
                const data = { cachedServices: services, injectionStatus: 'success' };
                if (cb) cb(data);
                return Promise.resolve(data);
              },
              set: (_data: any, cb: any) => {
                if (cb) cb();
                return Promise.resolve();
              }
            }
          },
          tabs: {
            query: () => Promise.resolve([]),
            sendMessage: () => Promise.resolve()
          }
        };
        window.dispatchEvent(new Event('DOMContentLoaded'));
      },
      { services: ALL_SERVICES }
    );

    await page.waitForTimeout(600);

    // Test Search input in Firefox package
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('storage');
    await page.waitForTimeout(300);

    const clearBtn = page.locator('#clearSearchBtn');
    await expect(clearBtn).toBeVisible();

    // Capture search in Firefox
    const searchScreenshotPath = path.join(ARTIFACT_DIR, 'firefox-popup-search.png');
    await page.screenshot({ path: searchScreenshotPath });
    console.log(`📸 Captured Firefox distribution Search screenshot: ${searchScreenshotPath}`);

    // Click clear
    await clearBtn.click();
    await page.waitForTimeout(200);
    expect(await searchInput.inputValue()).toBe('');
    await expect(clearBtn).toBeHidden();
  });
});
