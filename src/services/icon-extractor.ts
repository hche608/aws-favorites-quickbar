/**
 * Icon URL extraction from AWS Console DOM
 *
 * This module provides functionality to extract service icon URLs from the AWS Console
 * by scanning the DOM for service links and their associated images.
 */

/**
 * Extracts icon URLs from AWS Console DOM by scanning for service links
 *
 * This function searches the page for links to AWS Console services and extracts
 * the icon URLs from associated images. It identifies services by their subdomain
 * or path in the console URL.
 *
 * @returns Promise resolving to a map of service IDs to icon URLs
 *
 * @example
 * const iconMap = await extractIconUrlsFromConsole();
 * // Returns: { 'ec2': 'https://...', 's3': 'https://...', ... }
 */
export async function extractIconUrlsFromConsole(): Promise<Record<string, string>> {
  const iconMap: Record<string, string> = {};

  try {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="console.aws.amazon.com"]');

    for (const link of links) {
      try {
        const img = link.querySelector<HTMLImageElement>('img[src*="awsstatic.com"]');
        if (!img || !img.src) {
          continue;
        }

        const url = link.href;
        const urlObj = new URL(url);

        const homeMatch = urlObj.pathname.match(/\/([^\/]+)\/home/);
        if (!homeMatch) {
          continue;
        }

        const serviceId = homeMatch[1];
        if (serviceId && img.src) {
          iconMap[serviceId.toLowerCase()] = img.src;
        }
      } catch (_error) {
        // Skip this link if parsing fails
      }
    }
  } catch (error) {
    console.warn('AWS Favorites Quickbar: Error extracting icons', error);
  }

  return iconMap;
}
