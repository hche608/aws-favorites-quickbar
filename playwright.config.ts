import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  /* 60s timeout: logged-in sessions take ~3s; provides 1 minute if quick MFA tap is needed */
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  /* Must run sequentially because of the persistent user data directory */
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
