/**
 * Quickbar injector - injects services with duplicate filtering
 *
 * This module handles injecting user favorites and recently visited services
 * into the AWS Console quickbar, with duplicate detection and removal.
 *
 * Key rule: injection only proceeds if a CSS template can be extracted from
 * the first native pinned service. If no native pinned service exists,
 * injection does not happen — the user must pin at least one service manually.
 */

import { Service, AWSFavoriteClasses } from '../types';
import { waitForElement } from '../utils/dom';
import { extractAWSFavoriteClasses, waitForNativeFavorites } from './css-extractor';
import { createServiceLink } from './dom-builder';

/**
 * CSS selectors for finding the quickbar element.
 * Ordered by reliability — data attributes first, structural second.
 */
const QUICKBAR_SELECTORS = [
  'ol[data-rbd-droppable-id="global-nav-favorites-bar-list-edit-mode"]',
  '[data-testid="favorites-bar-list"]',
  'ol[data-rbd-droppable-id*="favorites"]',
  'header[id*="awsc-nav-header"] ol',
  'nav[role="navigation"] ol[role="list"]',
  'div[id*="awsc-navigation"] ol',
  'ol[class*="globalNav"]',
  'nav[class*="favorites"] ol',
  'ol[class*="favorites"]'
];

/**
 * Injects services into the AWS Console quickbar.
 *
 * This function:
 * 1. Finds the quickbar element
 * 2. Extracts CSS classes from the first native pinned service
 * 3. If no CSS template is available, stops (does not inject)
 * 4. Filters out services that already exist as native favorites
 * 5. Removes previously injected services
 * 6. Injects new service elements
 *
 * @param services - Array of services to inject
 * @param quickbar - Optional quickbar element (will be found if not provided)
 * @returns Promise resolving to true if injection succeeded, false if it could not proceed
 */
export async function injectServices(
  services: Service[],
  quickbar: HTMLElement | null = null
): Promise<boolean> {
  if (!services || services.length === 0) {
    return true;
  }

  if (!quickbar) {
    quickbar = await waitForElement(QUICKBAR_SELECTORS, 10000, 'quickbar');

    if (!quickbar) {
      console.error('AWS Favorites Quickbar: Quickbar element not found');
      return false;
    }
  }

  // Extract CSS classes from the first native pinned service
  const cssClasses = await getCSSTemplate(quickbar);

  if (!cssClasses) {
    // No native pinned service exists — cannot inject without a CSS template.
    // The user must pin at least one service manually in this account.
    console.warn(
      'AWS Favorites Quickbar: No native pinned service found. ' +
        'Please pin at least one service manually to provide a CSS template.'
    );
    return false;
  }

  // Identify native service IDs to avoid duplicates
  const nativeServiceIds = extractNativeServiceIds(quickbar);

  // Filter out services that already exist as native favorites
  const servicesToInject = services.filter(
    (service) => !nativeServiceIds.has(service.id.toLowerCase())
  );

  // Remove previously injected services before adding new ones
  const existingInjected = quickbar.querySelectorAll(
    '[data-source="user"], [data-source="recent"]'
  );
  for (const element of existingInjected) {
    element.remove();
  }

  // Inject each service using the extracted CSS template
  for (const service of servicesToInject) {
    const serviceLink = createServiceLink(service, cssClasses);
    if (serviceLink) {
      quickbar.appendChild(serviceLink);
    }
  }

  return true;
}

/**
 * Attempts to extract a CSS template from the first native pinned service.
 * First tries immediate extraction, then waits for native favorites to load.
 *
 * @param quickbar - The quickbar element to observe
 * @returns CSS classes if found, null if no native pinned service exists
 */
async function getCSSTemplate(quickbar: HTMLElement): Promise<AWSFavoriteClasses | null> {
  const immediate = extractAWSFavoriteClasses();
  if (immediate) {
    return immediate;
  }

  // Wait for native favorites to appear (they may load asynchronously)
  return waitForNativeFavorites(quickbar, 3000);
}

/**
 * Extracts service IDs from native (non-injected) favorites in the quickbar.
 *
 * @param quickbar - The quickbar element
 * @returns Set of lowercase service IDs that exist as native favorites
 */
function extractNativeServiceIds(quickbar: HTMLElement): Set<string> {
  const nativeServiceIds = new Set<string>();

  const nativeFavorites = quickbar.querySelectorAll('li:not([data-source])');
  for (const item of nativeFavorites) {
    const link = item.querySelector('a[data-testid^="awsc-nav-favorites-bar-"]');
    if (link) {
      const testId = link.getAttribute('data-testid');
      if (testId) {
        const serviceId = testId.replace('awsc-nav-favorites-bar-', '');
        nativeServiceIds.add(serviceId.toLowerCase());
      }
    }
  }

  return nativeServiceIds;
}
