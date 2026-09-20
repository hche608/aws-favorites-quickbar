/**
 * AWS Favorites Quickbar - Main Content Script
 *
 * This is the main entry point for the content script that runs on AWS Console pages.
 * It coordinates the extraction of services, merging of user favorites with recently visited,
 * and injection into the AWS Console quickbar.
 *
 * Flow:
 * 1. Load settings from storage (explicit first-launch vs returning-user paths)
 * 2. Apply visual mode (simulate theme change if needed)
 * 3. Parse recently visited services from page
 * 4. Merge pinned favorites + recently visited
 * 5. Cap at maxServices
 * 6. Extract CSS from first native pinned service
 * 7. Inject into quickbar
 */

import {
  waitForDOMReady,
  waitForElement,
  isAWSConsolePage,
  isAWSConsoleHomepage,
  location
} from './utils/dom';
import { saveServicesToStorage, loadServicesFromStorage } from './utils/storage';
import { detectRegion } from './utils/region';
import { extractIconUrlsFromConsole } from './services/icon-extractor';
import { isValidIconUrl, updateServiceIcons } from './services/icon-validator';
import {
  waitForRecentlyVisitedWidget,
  parseRecentlyVisited
} from './services/recently-visited-parser';
import { mergeServices } from './services/service-merger';
import { injectServices } from './quickbar/injector';
import { runtime, storage as browserStorage } from './browser-api';
import { Service } from './types';
import { loadSettings, applyVisualMode } from './settings';
import { resolveServiceIcon } from './services/service-icons';
import { formatServiceName } from './services/service-catalog';

/**
 * CSS selectors for the AWS Console quickbar element.
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
 * Builds the user favorites service list from favorite IDs and available service data.
 *
 * @param favoriteIds - Array of service IDs the user has pinned
 * @param availableServices - Map of service ID (lowercase) to Service object
 * @param region - Current AWS region for URL construction
 * @returns Array of Service objects for pinned favorites
 */
function buildUserFavorites(
  favoriteIds: string[],
  availableServices: Record<string, Service>,
  region: string
): Service[] {
  return favoriteIds.map((id) => {
    const existing = availableServices[id.toLowerCase()];
    if (existing) {
      return { ...existing, source: 'user' as const };
    }
    // Service ID is pinned but not found in available data.
    // Construct with the information we have — the ID and region.
    const displayName = id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      id: id,
      name: displayName,
      iconUrl: resolveServiceIcon(id, null),
      consoleUrl: `https://${region}.console.aws.amazon.com/${id}/home?region=${region}`,
      source: 'user' as const
    };
  });
}

/**
 * Initializes the quickbar injection process.
 *
 * Orchestrates the full lifecycle on an AWS Console page:
 * 1. Waits for DOM readiness and verifies console page
 * 2. Detects current AWS region from URL or storage
 * 3. Loads settings (user favorites, max services cap, visual mode)
 * 4. Applies visual mode theme override
 * 5. Collects user favorites and recently visited services (from homepage or cache)
 * 6. Merges and caps services at maxServices limit
 * 7. Injects into quickbar using dynamically extracted native CSS classes
 * 8. Triggers non-blocking background icon discovery
 */
async function init(): Promise<void> {
  await waitForDOMReady();

  if (!isAWSConsolePage()) {
    return;
  }

  const region = detectRegion();
  const settings = await loadSettings();

  await applyVisualMode(settings.visualMode);

  const quickbarPromise = waitForElement(QUICKBAR_SELECTORS, 10000, 'quickbar');

  let userFavorites: Service[] = [];
  let recentServices: Service[] = [];

  if (isAWSConsoleHomepage()) {
    const widgetLoaded = await waitForRecentlyVisitedWidget();

    if (widgetLoaded) {
      const scrapedServices = await parseRecentlyVisited();
      const previousCached = loadServicesFromStorage();
      const previousRecents = previousCached
        ? previousCached.filter((s) => s.source === 'recent')
        : [];
      recentServices = mergeServices([], [...scrapedServices, ...previousRecents]);
      if (recentServices.length > 50) {
        recentServices = recentServices.slice(0, 50);
      }

      const recentMap: Record<string, Service> = {};
      for (const s of recentServices) {
        recentMap[s.id.toLowerCase()] = s;
      }

      userFavorites = buildUserFavorites(settings.favoriteIds, recentMap, region);

      const allServices = mergeServices(userFavorites, recentServices);
      saveServicesToStorage(allServices);
    }
  } else {
    const cachedServices = loadServicesFromStorage();
    const pathname = typeof location.getPathname === 'function' ? location.getPathname() || '' : '';
    const currentServiceMatch = pathname.match(/\/([^\/]+)\/home/);
    const currentServiceId =
      currentServiceMatch && currentServiceMatch[1].toLowerCase() !== 'console'
        ? currentServiceMatch[1].toLowerCase()
        : null;

    const cachedMap: Record<string, Service> = {};
    if (cachedServices !== undefined) {
      for (const s of cachedServices) {
        cachedMap[s.id.toLowerCase()] = s;
      }
      userFavorites = buildUserFavorites(settings.favoriteIds, cachedMap, region);
      recentServices = cachedServices.filter(
        (s) =>
          s.source === 'recent' &&
          !settings.favoriteIds.some((id) => id.toLowerCase() === s.id.toLowerCase())
      );
    } else {
      userFavorites = buildUserFavorites(settings.favoriteIds, {}, region);
    }

    if (
      currentServiceId &&
      !settings.favoriteIds.some((id) => id.toLowerCase() === currentServiceId)
    ) {
      const active: Service = cachedMap[currentServiceId] || {
        id: currentServiceId,
        name: formatServiceName(currentServiceId),
        iconUrl: resolveServiceIcon(currentServiceId, null),
        consoleUrl: `https://${region}.console.aws.amazon.com/${currentServiceId}/home?region=${region}`,
        source: 'recent'
      };
      recentServices = [
        active,
        ...recentServices.filter((s) => s.id.toLowerCase() !== currentServiceId)
      ];
      if (recentServices.length > 50) {
        recentServices = recentServices.slice(0, 50);
      }
      saveServicesToStorage(mergeServices(userFavorites, recentServices));
    }
  }

  let mergedServices = mergeServices(userFavorites, recentServices);
  if (mergedServices.length > settings.maxServices) {
    mergedServices = mergedServices.slice(0, settings.maxServices);
  }

  const quickbar = await quickbarPromise;
  const injectionResult = await injectServices(mergedServices, quickbar);

  // Store injection status so the popup can show helpful messages
  await browserStorage.local.set({
    injectionStatus: injectionResult ? 'success' : 'no-native-pin'
  });

  updateIconsInBackground(userFavorites, recentServices, settings.maxServices, quickbar);
}

/**
 * Updates service icons in the background without blocking the main injection.
 *
 * Scans the page DOM for newly discovered AWS CDN icon URLs, validates each icon,
 * updates the cached service records, and re-renders the quickbar if icons change.
 *
 * @param userFavorites - User-configured favorite services
 * @param recentServices - Recently visited services
 * @param maxServices - Maximum number of services to display
 * @param quickbar - Quickbar container element
 */
function updateIconsInBackground(
  userFavorites: Service[],
  recentServices: Service[],
  maxServices: number,
  quickbar: HTMLElement | null
): void {
  (async () => {
    const iconMap = await extractIconUrlsFromConsole();

    if (Object.keys(iconMap).length === 0) {
      return;
    }

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

    const updatedRecentServices = await updateServiceIcons(recentServices, iconMap);

    const updatedMerged = mergeServices(updatedUserFavorites, updatedRecentServices);
    saveServicesToStorage(updatedMerged);

    let displayMerged = updatedMerged;
    if (displayMerged.length > maxServices) {
      displayMerged = displayMerged.slice(0, maxServices);
    }

    await injectServices(displayMerged, quickbar);
  })().catch((error) => {
    console.error('AWS Favorites Quickbar: Background icon update error', error);
  });
}

/**
 * Message listener for popup communication.
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
    return true;
  }
});

// Initialize on script load
init().catch((error) => {
  console.error('AWS Favorites Quickbar: Initialization failed', error);
});
