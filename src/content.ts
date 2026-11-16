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
  location,
  parseServiceIdFromUrl
} from './utils/dom';

import { saveServicesToStorage, loadServicesFromStorage } from './utils/storage';
import { detectRegion } from './utils/region';
import {
  waitForRecentlyVisitedWidget,
  parseRecentlyVisited
} from './services/recently-visited-parser';
import { mergeServices } from './services/service-merger';
import { injectServices } from './quickbar/injector';
import { storage as browserStorage } from './browser-api';
import { Service } from './types';
import { loadSettings, applyVisualMode } from './settings';
import { resolveServiceIcon } from './services/service-icons';
import { formatServiceName } from './services/service-catalog';
import { initCodePipelineHover } from './features/codepipeline/hover-detector';
import { buildUserFavorites, updateIconsInBackground } from './quickbar/content-updater';

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

  // Initialize CodePipeline hover preview when on CodePipeline pages
  initCodePipelineHover().catch((error) => {
    console.warn('AWS Favorites Quickbar: Failed to initialize CodePipeline hover', error);
  });

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
    const currentServiceId = parseServiceIdFromUrl(pathname);

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
      let homePath = `${currentServiceId}/home`;
      if (currentServiceId === 'route53' || currentServiceId === 'connect') {
        homePath = `${currentServiceId}/v2/home`;
      } else if (currentServiceId === 'sns') {
        homePath = `${currentServiceId}/v3/home`;
      } else if (currentServiceId === 'cloudfront') {
        homePath = `${currentServiceId}/v4/home`;
      }
      const active: Service = cachedMap[currentServiceId] || {
        id: currentServiceId,
        name: formatServiceName(currentServiceId),
        iconUrl: resolveServiceIcon(currentServiceId, null),
        consoleUrl: `https://${region}.console.aws.amazon.com/${homePath}?region=${region}`,
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
 * Synchronizes the quickbar DOM when storage changes.
 * Used for both sync-driven (settings changes) and local-driven (cached services) updates.
 * When called with an empty array (sync change), re-reads from localStorage cache.
 * Avoids writing back to storage to prevent cross-tab cascading loops.
 */
async function syncQuickbarDisplay(cachedServices: Service[]): Promise<void> {
  if (!isAWSConsolePage()) {
    return;
  }

  const region = detectRegion();
  const settings = await loadSettings();
  if (!settings) {
    return;
  }

  // If no services passed (sync-driven), fall back to local cache
  const services = cachedServices.length > 0 ? cachedServices : loadServicesFromStorage() || [];

  const cachedMap: Record<string, Service> = {};
  for (const s of services) {
    cachedMap[s.id.toLowerCase()] = s;
  }

  const favoriteIds = settings.favoriteIds || [];
  const userFavorites = buildUserFavorites(favoriteIds, cachedMap, region);
  const recentServices = services.filter(
    (s) =>
      s.source === 'recent' && !favoriteIds.some((id) => id.toLowerCase() === s.id.toLowerCase())
  );

  let mergedServices = mergeServices(userFavorites, recentServices);
  if (mergedServices.length > settings.maxServices) {
    mergedServices = mergedServices.slice(0, settings.maxServices);
  }

  const quickbar = await waitForElement(QUICKBAR_SELECTORS, 5000, 'quickbar');
  await injectServices(mergedServices, quickbar);
}

/**
 * Unified storage change listener — single source of truth for cross-tab synchronization.
 *
 * Handles both storage areas:
 * - sync: Popup settings changes (userFavorites, maxServices, visualMode)
 * - local: Recently visited service cache updates from Console homepage tabs
 *
 * All listeners are strictly read-only: non-homepage tabs update DOM only,
 * never writing back to storage (prevents cascading loops).
 */
browserStorage.onChanged.addListener((changes, areaName) => {
  // 1. Handle Popup setting changes (sync storage)
  if (areaName === 'sync') {
    if (changes.userFavorites || changes.maxServices) {
      syncQuickbarDisplay([]).catch((error) => {
        console.warn('AWS Favorites Quickbar: Sync storage change re-render failed', error);
      });
    }
    if (changes.visualMode && changes.visualMode.newValue) {
      applyVisualMode(changes.visualMode.newValue).catch(() => {});
    }
  }

  // 2. Handle Recently Visited cache updates (local storage)
  if (areaName === 'local' && changes.cachedServices && changes.cachedServices.newValue) {
    if (!isAWSConsoleHomepage()) {
      const data = changes.cachedServices.newValue;
      try {
        localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));
      } catch {
        // Ignore storage write errors in restricted contexts
      }
      const services = Array.isArray(data.services) ? data.services : [];
      if (services.length > 0) {
        syncQuickbarDisplay(services).catch((error) => {
          console.warn('AWS Favorites Quickbar: Cross-tab sync update failed', error);
        });
      }
    }
  }
});

// Initialize on script load
init().catch((error) => {
  console.error('AWS Favorites Quickbar: Initialization failed', error);
});
