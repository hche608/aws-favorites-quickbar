import { test } from './fixtures';
import { ensureAwsLoggedIn } from './helpers/auth';
import * as fs from 'fs';
import * as path from 'path';

test('scrape all services from /console/services#allServices', async ({ page }) => {
  await ensureAwsLoggedIn(page);

  console.log('🌐 Navigating to /console/services#allServices ...');
  await page.goto('https://ap-southeast-2.console.aws.amazon.com/console/services#allServices');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(4000);

  // Inspect the whole item container for a service card (e.g. IAM or EC2)
  const cardInspect = await page.evaluate(() => {
    const iamLink = document.querySelector('a[href*="/iam/home"]');
    const container =
      iamLink?.closest('li, div[class*="service-item"]') || iamLink?.parentElement?.parentElement;
    return {
      containerTag: container?.tagName,
      containerClass: container?.className,
      containerHTML: container?.outerHTML.slice(0, 800)
    };
  });
  console.log('🔍 IAM Service Item Container:', JSON.stringify(cardInspect, null, 2));
  // Scrape all service links and information from the page
  const scrapedServices = await page.evaluate(() => {
    const services: Array<{
      id: string;
      name: string;
      description: string;
      consoleUrl: string;
      iconUrl: string | null;
      category?: string;
    }> = [];

    const seenIds = new Set<string>();

    // 1. First collect any existing icons from navbar or page
    const iconMap: Record<string, string> = {};
    const allImgs = Array.from(
      document.querySelectorAll('img[src*="awsstatic.com"], img[src*="cloudfront.net"]')
    );
    for (const img of allImgs) {
      const src = img.getAttribute('src');
      const serviceContainer = img.closest('[data-service-id], li, a[href*="/home"]');
      const href =
        serviceContainer?.getAttribute('href') ||
        serviceContainer?.querySelector('a')?.getAttribute('href') ||
        '';
      const m = href.match(/\/([^\/]+)\/home/);
      if (m && src) {
        iconMap[m[1].toLowerCase()] = src;
      }
    }

    // 2. Query all service links on the services directory page
    const allLinks = Array.from(document.querySelectorAll('a[href*="/home"]'));

    for (const link of allLinks) {
      const href = link.getAttribute('href') || '';
      // Rule 4: Strictly match /<serviceId>/home
      const match = href.match(/\/([^\/]+)\/home/);
      if (!match) {
        continue;
      }

      const serviceId = match[1].toLowerCase();
      if (seenIds.has(serviceId) || serviceId === 'console') {
        continue;
      }
      seenIds.add(serviceId);

      // Extract Clean Name: Prefer dedicated h4/label tag
      const labelEl = link.querySelector('h4, [class*="label"], [class*="title"]');
      const name = labelEl?.textContent?.trim() || link.textContent?.trim() || serviceId;

      // Extract Description: From title attribute or paragraph
      const desc = link.getAttribute('title') || '';

      // Extract Icon: from img in link, or iconMap
      const img = link.querySelector('img') || link.closest('li, div')?.querySelector('img');
      const iconUrl = img?.getAttribute('src') || iconMap[serviceId] || null;

      // Extract Category if available
      const section = link.closest('section, [role="region"], div[class*="category"]');
      const categoryHeader = section?.querySelector('h2, h3, [class*="header"]');
      const category = categoryHeader?.textContent?.trim();

      // Resolve full absolute URL
      const fullUrl = href.startsWith('http') ? href : `https://${window.location.hostname}${href}`;

      services.push({
        id: serviceId,
        name,
        description: desc,
        consoleUrl: fullUrl,
        iconUrl,
        category: category || undefined
      });
    }

    return services;
  });

  console.log(`\n🎉 Found a total of ${scrapedServices.length} unique AWS services on the page!`);

  // Save to file for subsequent tests
  const outputDir = path.resolve(process.cwd(), '.e2e-profile');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.resolve(outputDir, 'all-services.json');
  fs.writeFileSync(outputPath, JSON.stringify(scrapedServices, null, 2), 'utf-8');
  console.log(`💾 Saved complete service catalog to: ${outputPath}`);

  // Summary statistics
  const withIcons = scrapedServices.filter((s) => s.iconUrl !== null).length;
  console.log(`📊 Services with matched icons: ${withIcons} / ${scrapedServices.length}`);

  // Sample preview of first 12 services
  console.log('\n🔍 Sample Preview (First 12 services):');
  console.log(JSON.stringify(scrapedServices.slice(0, 12), null, 2));
});
