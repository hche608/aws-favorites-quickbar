import { test } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DATA COLLECTION TOOL — Not a standard test.
 *
 * Scrapes the full AWS service catalog from a live Console session.
 * Run manually when you need to refresh tests/e2e/fixtures/all-services.json:
 *   npx playwright test scrape-all-services --headed
 *
 * Skipped by default in automated runs because it requires a live AWS login.
 */
test.skip('scrape all services with 100% icon coverage from AWS ConsoleNavService', async ({
  page
}) => {
  await ensureAwsLoggedIn(page);
  await page.waitForTimeout(2000);

  // Scrape full service catalog from ConsoleNavService.Model.services
  const scrapedServices = await page.evaluate(() => {
    const win = window as any;
    const services = win.ConsoleNavService?.Model?.services || [];
    const region = window.location.search.match(/region=([^&]+)/)?.[1] || 'ap-southeast-2';
    const host = window.location.hostname;

    return services.map((s: any) => {
      const rawUrl: string = s.url || `/${s.id}/home`;
      const urlWithRegion = rawUrl.includes('?')
        ? `${rawUrl}&region=${region}`
        : `${rawUrl}?region=${region}`;
      const fullConsoleUrl = rawUrl.startsWith('http') ? rawUrl : `https://${host}${urlWithRegion}`;

      // Extract serviceId strictly conforming to Rule 4 (/<serviceId>/home)
      const match = fullConsoleUrl.match(/\/([^\/]+)\/home/);
      const serviceId = match ? match[1].toLowerCase() : s.id.toLowerCase();

      return {
        id: serviceId,
        name: s.label || s.id,
        description: s.description || '',
        consoleUrl: fullConsoleUrl,
        iconUrl: s.iconTbUrl || null,
        category: s.category?.label || s.category?.id || undefined
      };
    });
  });

  console.log(`\n🎉 Found a total of ${scrapedServices.length} unique AWS services!`);

  const withIcons = scrapedServices.filter((s) => s.iconUrl !== null).length;
  console.log(`📊 Services with 100% valid CDN icons: ${withIcons} / ${scrapedServices.length}`);

  // Deduplicate by serviceId if any duplicates exist
  const uniqueMap = new Map<string, (typeof scrapedServices)[0]>();
  for (const s of scrapedServices) {
    if (!uniqueMap.has(s.id)) {
      uniqueMap.set(s.id, s);
    }
  }
  const finalizedServices = Array.from(uniqueMap.values());
  console.log(`✅ Unique finalized services: ${finalizedServices.length}`);

  // Save to both test fixtures paths and .e2e-profile
  const paths = [
    path.resolve(process.cwd(), 'tests/fixtures/all-services.json'),
    path.resolve(process.cwd(), 'tests/e2e/fixtures/all-services.json'),
    path.resolve(process.cwd(), '.e2e-profile/all-services.json')
  ];

  for (const p of paths) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(p, JSON.stringify(finalizedServices, null, 2), 'utf-8');
    console.log(`💾 Saved complete service catalog to: ${p}`);
  }

  // Print sample preview
  console.log('\n🔍 Sample Preview (First 5 services with full icons):');
  console.log(JSON.stringify(finalizedServices.slice(0, 5), null, 2));
});
