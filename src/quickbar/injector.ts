/**
 * Quickbar injector - injects services with duplicate filtering
 *
 * This module handles injecting user favorites and recently visited services
 * into the AWS Console quickbar, with duplicate detection and removal.
 */

import { Service } from '../types';
import { waitForElement } from '../utils/dom';
import { extractAWSFavoriteClasses, waitForNativeFavorites } from './css-extractor';
import { createServiceLink } from './dom-builder';

/**
 * CSS selectors for finding the quickbar element
 *
 * These selectors are ordered by reliability:
 * 1. Data attributes (most stable)
 * 2. Structural selectors (moderately stable)
 * 3. Class-based selectors (less stable, but with wildcards)
 */
const QUICKBAR_SELECTORS = [
  // Data attribute selectors (most reliable)
  'ol[data-rbd-droppable-id="global-nav-favorites-bar-list-edit-mode"]',
  '[data-testid="favorites-bar-list"]',
  'ol[data-rbd-droppable-id*="favorites"]',

  // Structural selectors (look for ol inside nav header)
  'header[id*="awsc-nav-header"] ol',
  'nav[role="navigation"] ol[role="list"]',
  'div[id*="awsc-navigation"] ol',

  // Class-based with wildcards (fallback)
  'ol[class*="globalNav"]',
  'nav[class*="favorites"] ol',
  'ol[class*="favorites"]',

  // Legacy selector (kept for backwards compatibility)
  'ol.globalNav-2279'
];

/**
 * Injects services into the AWS Console quickbar
 * Filters out duplicates that already exist as native favorites
 * Removes previously injected services before adding new ones
 * @param services - Array of services to inject
 * @param quickbar - Optional quickbar element (will be found if not provided)
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function injectServices(
  services: Service[],
  quickbar: HTMLElement | null = null
): Promise<boolean> {
  if (!services || services.length === 0) {
    return true;
  }

  try {
    if (!quickbar) {
      quickbar = await waitForElement(QUICKBAR_SELECTORS, 10000, 'quickbar');

      if (!quickbar) {
        console.error('AWS Favorites Quickbar: Quickbar not found after trying all selectors');
        return false;
      }
    }

    let cssClasses = extractAWSFavoriteClasses();
    const nativeServiceIds = new Set<string>();

    if (!cssClasses) {
      cssClasses = await waitForNativeFavorites(quickbar, 3000);
    }

    if (cssClasses) {
      const nativeFavorites = quickbar.querySelectorAll('li:not([data-source])');
      nativeFavorites.forEach((item) => {
        const link = item.querySelector('a[data-testid^="awsc-nav-favorites-bar-"]');
        if (link) {
          const testId = link.getAttribute('data-testid');
          if (testId) {
            const serviceId = testId.replace('awsc-nav-favorites-bar-', '');
            nativeServiceIds.add(serviceId.toLowerCase());
          }
        }
      });
    }

    const servicesToInject = services.filter(
      (service) => !nativeServiceIds.has(service.id.toLowerCase())
    );

    const existingInjected = quickbar.querySelectorAll(
      '[data-source="user"], [data-source="recent"]'
    );
    existingInjected.forEach((element) => element.remove());

    for (const service of servicesToInject) {
      const serviceLink = createServiceLink(service, cssClasses);
      if (serviceLink) {
        quickbar.appendChild(serviceLink);
      }
    }

    return true;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error injecting services', error);
    return false;
  }
}
