import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * E2E Suite: Firefox MV3 Compatibility & Mozilla Add-ons (AMO) Validation
 *
 * Validates:
 * 1. Complete packaging of the Firefox MV3 extension (build-firefox.sh).
 * 2. Official Mozilla Add-ons (AMO) linter compliance via `web-ext lint` (0 errors, 0 warnings).
 * 3. Strict Gecko MV3 manifest schema requirements (gecko.id, permissions, content scripts).
 * 4. Firefox distribution UI asset integrity and DOM structure rendering.
 */
test.describe('Firefox MV3 Compatibility Suite', () => {
  const rootDir = process.cwd();
  const firefoxDistDir = path.resolve(rootDir, 'dist/firefox');
  const firefoxZipPath = path.resolve(rootDir, 'aws-favorites-quickbar-firefox.zip');

  test('Case 1: Should build and package valid Firefox distribution', async () => {
    // 1. Run Firefox build script
    console.log('📦 Executing Firefox build script...');
    execSync('./scripts/build-firefox.sh', { cwd: rootDir, stdio: 'pipe' });

    // 2. Verify dist/firefox directory exists
    expect(fs.existsSync(firefoxDistDir)).toBe(true);

    // 3. Verify all required files are present
    const requiredFiles = [
      'manifest.json',
      'content.js',
      'popup.js',
      'popup.html',
      'popup.css',
      'browser-polyfill.min.js',
      'icons/icon16.png',
      'icons/icon48.png',
      'icons/icon128.png'
    ];

    for (const file of requiredFiles) {
      const filePath = path.resolve(firefoxDistDir, file);
      expect(fs.existsSync(filePath), `Missing Firefox asset: ${file}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(0);
    }
    console.log('✅ All required Firefox distribution files exist with non-zero size.');

    // 4. Verify packaged zip distribution
    expect(fs.existsSync(firefoxZipPath)).toBe(true);
    const zipStat = fs.statSync(firefoxZipPath);
    expect(zipStat.size).toBeGreaterThan(10_000); // At least 10KB
    console.log(`✅ Firefox zip package created: ${(zipStat.size / 1024).toFixed(1)} KB`);
  });

  test('Case 2: Should pass official Mozilla web-ext linter with 0 errors and 0 warnings', async () => {
    console.log('🔍 Running official Mozilla web-ext lint on dist/firefox...');

    // Run web-ext lint with JSON output format
    const output = execSync('npx web-ext lint --source-dir dist/firefox --output json', {
      cwd: rootDir,
      encoding: 'utf8'
    });

    const report = JSON.parse(output);
    console.log(`📊 Linter summary:`, {
      errors: report.summary.errors,
      warnings: report.summary.warnings,
      notices: report.summary.notices
    });

    // Assert strictly zero errors and zero warnings
    expect(report.summary.errors).toBe(0);
    expect(report.summary.warnings).toBe(0);
    console.log('🎉 Mozilla Add-ons (AMO) compliance check passed cleanly!');
  });

  test('Case 3: Should meet all Firefox MV3 Gecko manifest requirements', async () => {
    const manifestPath = path.resolve(firefoxDistDir, 'manifest.json');
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(rawManifest);

    // 1. MV3 requirement
    expect(manifest.manifest_version).toBe(3);

    // 2. Gecko ID requirement for Firefox MV3 extensions
    expect(manifest.browser_specific_settings?.gecko?.id).toBe('aws-favorites-quickbar@8its.pixel');
    console.log('✅ Verified Gecko extension ID:', manifest.browser_specific_settings.gecko.id);

    // 3. Permissions
    expect(manifest.permissions).toContain('storage');
    expect(manifest.host_permissions).toContain('https://*.console.aws.amazon.com/*');

    // 4. Content script configuration
    expect(manifest.content_scripts).toHaveLength(1);
    const contentScript = manifest.content_scripts[0];
    expect(contentScript.matches).toContain('https://*.console.aws.amazon.com/*');
    expect(contentScript.js).toContain('content.js');
    expect(contentScript.run_at).toBe('document_idle');

    // 5. Popup action
    expect(manifest.action.default_popup).toBe('popup.html');
    expect(manifest.action.default_icon['16']).toBe('icons/icon16.png');

    console.log('✅ Firefox MV3 manifest schema strictly verified.');
  });

  test('Case 4: Should render Firefox popup DOM correctly', async ({ page }) => {
    const popupHtmlPath = path.resolve(firefoxDistDir, 'popup.html');
    const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');

    // Load the Firefox distribution popup HTML directly
    await page.setContent(popupHtml);

    // Verify all critical UI components are present in DOM
    await expect(page.locator('#searchInput')).toBeAttached();
    await expect(page.locator('#serviceList')).toBeAttached();
    await expect(page.locator('#maxServicesInput')).toBeAttached();
    await expect(page.locator('#visualModeSelect')).toBeAttached();
    await expect(page.locator('#pinningNote')).toBeAttached();
    await expect(page.locator('#emptyState')).toBeAttached();
    await expect(page.locator('#errorState')).toBeAttached();
    await expect(page.locator('#favoritesBadge')).toBeAttached();
    await expect(page.locator('#clearSearchBtn')).toBeAttached();

    console.log('✅ Firefox popup HTML DOM structure verified.');
  });
});
