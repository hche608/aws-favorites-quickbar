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
  isAWSConsoleHomepage
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
      iconUrl: null,
      consoleUrl: `https://${region}.console.aws.amazon.com/${id}/home?region=${region}`,
      source: 'user' as const
    };
  });
}

/**
 * Initializes the quickbar injection process.
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
      recentServices = await parseRecentlyVisited();

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

    if (cachedServices !== undefined) {
      const cachedMap: Record<string, Service> = {};
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
  }

  let mergedServices = mergeServices(userFavorites, recentServices);
  if (mergedServices.length > settings.maxServices) {
    mergedServices = mergedServices.slice(0, settings.maxServices);
  }

  const quickbar = await quickbarPromise;
  const injectionResult = await injectServices(mergedServices, quickbar);

  // Store injection status so the popup can show helpful messages
  await browserStorage.local.set({ injectionStatus: injectionResult ? 'success' : 'no-native-pin' });

  updateIconsInBackground(userFavorites, recentServices, settings.maxServices, quickbar);
}

/**
 * Updates service icons in the background without blocking the main injection.
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

    let updatedMerged = mergeServices(updatedUserFavorites, updatedRecentServices);
    if (updatedMerged.length > maxServices) {
      updatedMerged = updatedMerged.slice(0, maxServices);
    }

    saveServicesToStorage(updatedMerged);
    await injectServices(updatedMerged, quickbar);
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
