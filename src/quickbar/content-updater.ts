/**
 * Helper utilities for content script service processing and icon updates.
 */

import { Service } from '../types';
import { resolveServiceIcon } from '../services/service-icons';
import { formatServiceName } from '../services/service-catalog';
import { normalizeServiceId } from '../services/service-aliases';
import { extractIconUrlsFromConsole } from '../services/icon-extractor';
import { isValidIconUrl, updateServiceIcons } from '../services/icon-validator';
import { mergeServices } from '../services/service-merger';
import { saveServicesToStorage } from '../utils/storage';
import { injectServices } from './injector';

/**
 * Builds the user favorites service list from favorite IDs and available service data.
 *
 * @param favoriteIds - Array of service IDs the user has pinned
 * @param availableServices - Map of service ID (lowercase) to Service object
 * @param region - Current AWS region for URL construction
 * @returns Array of Service objects for pinned favorites
 */
export function buildUserFavorites(
  favoriteIds: string[],
  availableServices: Record<string, Service>,
  region: string
): Service[] {
  return favoriteIds.map((id) => {
    const canonical = normalizeServiceId(id);
    const existing = availableServices[id.toLowerCase()] || availableServices[canonical];
    if (existing) {
      return { ...existing, source: 'user' as const };
    }
    const displayName = formatServiceName(id);
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
export function updateIconsInBackground(
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
