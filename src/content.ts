/**
 * AWS Favorites Quickbar - Main Content Script
 *
 * This is the main entry point for the content script that runs on AWS Console pages.
 * It coordinates the extraction of services, merging of user favorites with recently visited,
 * and injection into the AWS Console quickbar.
 *
 * Performance: MutationObserver-based, parallel execution, ~1s injection
 */

import {
  waitForDOMReady,
  waitForElement,
  isAWSConsolePage,
  isAWSConsoleHomepage
} from './utils/dom';
import { saveServicesToStorage, loadServicesFromStorage, loadUserFavorites } from './utils/storage';
import { detectRegion } from './utils/region';
import { extractIconUrlsFromConsole } from './services/icon-extractor';
import { isValidIconUrl, updateServiceIcons } from './services/icon-validator';
import {
  waitForRecentlyVisitedWidget,
  parseRecentlyVisited
} from './services/recently-visited-parser';
import { mergeServices } from './services/service-merger';
import { injectServices } from './quickbar/injector';
import { storage as browserStorage, runtime } from './browser-api';
import { Service } from './types';

/**
 * CSS selectors for the AWS Console quickbar element
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
 * Initializes the quickbar injection process
 *
 * This function:
 * 1. Waits for the DOM to be ready
 * 2. Checks if we're on an AWS Console page
 * 3. Loads user favorites and max services configuration
 * 4. Parses recently visited services (on homepage)
 * 5. Merges and injects services into the quickbar
 * 6. Updates icons in the background
 */
async function init(): Promise<void> {
  try {
    await waitForDOMReady();

    if (!isAWSConsolePage()) {
      return;
    }

    const region = detectRegion();
    const favoriteIds = await loadUserFavorites();

    // Load max services configuration
    let maxServices = 10;
    try {
      const result = await browserStorage.sync.get(['maxServices']);
      if (result.maxServices && typeof result.maxServices === 'number') {
        maxServices = result.maxServices;
      }
    } catch (error) {
      // Use default value if sync storage fails
      console.warn(
        'AWS Favorites Quickbar: Could not load maxServices from sync storage, using default',
        error
      );
    }

    // Start quickbar detection in parallel with service loading
    const quickbarPromise = waitForElement(QUICKBAR_SELECTORS, 10000, 'quickbar');

    let userFavorites: Service[] = [];
    let recentServices: Service[] = [];

    if (isAWSConsoleHomepage()) {
      // On homepage: parse recently visited widget
      const widgetLoaded = await waitForRecentlyVisitedWidget();

      if (widgetLoaded) {
        recentServices = await parseRecentlyVisited();

        // Create a map for quick lookup of recent services
        const recentMap: Record<string, Service> = {};
        recentServices.forEach((s) => {
          recentMap[s.id.toLowerCase()] = s;
        });

        // Build user favorites list, using data from recent services when available
        userFavorites = favoriteIds.map((id) => {
          const recent = recentMap[id.toLowerCase()];
          if (recent) {
            return { ...recent, source: 'user' };
          }
          // Fallback: create service with basic info
          const fallbackName = id
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          return {
            id: id,
            name: fallbackName,
            iconUrl: null,
            consoleUrl: `https://${region}.console.aws.amazon.com/${id}/home?region=${region}`,
            source: 'user'
          };
        });

        // Save merged services to storage for use on other pages
        const allServices = mergeServices(userFavorites, recentServices);
        saveServicesToStorage(allServices);
      }
    } else {
      // On other pages: load from cached storage
      const cachedServices = loadServicesFromStorage();
      const cachedPinned = cachedServices.filter((s) =>
        favoriteIds.some((id) => id.toLowerCase() === s.id.toLowerCase())
      );
      recentServices = cachedServices.filter(
        (s) =>
          s.source === 'recent' &&
          !favoriteIds.some((id) => id.toLowerCase() === s.id.toLowerCase())
      );

      // Build user favorites from cache or create fallback
      userFavorites = favoriteIds.map((id) => {
        const cached = cachedPinned.find((s) => s.id.toLowerCase() === id.toLowerCase());
        if (cached) {
          return { ...cached, source: 'user' };
        }
        // Fallback: create service with basic info
        const fallbackName = id
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return {
          id: id,
          name: fallbackName,
          iconUrl: null,
          consoleUrl: `https://${region}.console.aws.amazon.com/${id}/home?region=${region}`,
          source: 'user'
        };
      });
    }

    // Merge and limit services
    let mergedServices = mergeServices(userFavorites, recentServices);
    if (mergedServices.length > maxServices) {
      mergedServices = mergedServices.slice(0, maxServices);
    }

    // Wait for quickbar and inject services
    const quickbar = await quickbarPromise;
    await injectServices(mergedServices, quickbar);

    // Background icon update (non-blocking)
    (async () => {
      try {
        const iconMap = await extractIconUrlsFromConsole();

        if (Object.keys(iconMap).length > 0) {
          // Update user favorites with new icons
          const updatedUserFavorites = await Promise.all(
            userFavorites.map(async (service) => {
              const newIconUrl = iconMap[service.id.toLowerCase()];
              if (newIconUrl && newIconUrl !== service.iconUrl) {
                const isValid = await isValidIconUrl(newIconUrl);
                if (isValid) {
                  return { ...service, iconUrl: newIconUrl };
                }
              }
              return service;
            })
          );

          // Update recent services with new icons
          const updatedRecentServices = await updateServiceIcons(recentServices, iconMap);

          // Merge and limit updated services
          let updatedMerged = mergeServices(updatedUserFavorites, updatedRecentServices);
          if (updatedMerged.length > maxServices) {
            updatedMerged = updatedMerged.slice(0, maxServices);
          }

          // Save and re-inject with updated icons
          saveServicesToStorage(updatedMerged);
          await injectServices(updatedMerged, quickbar);
        }
      } catch (error) {
        console.error('AWS Favorites Quickbar: Background update error', error);
      }
    })();
  } catch (error) {
    console.error('AWS Favorites Quickbar: Initialization error', error);
  }
}

/**
 * Message listener for quickbar updates
 *
 * Listens for messages from the popup to refresh the quickbar
 */
runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'updateQuickbar') {
    init()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error: Error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

// Initialize on script load
init();
