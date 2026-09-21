/**
 * Search and filter services
 *
 * This module provides functionality for filtering services based on search queries.
 * When a query is present, it searches across both currently loaded services and
 * the broader 220+ AWS baseline catalog.
 */

import { Service } from '../types';
import { getUnifiedSearchPool, getCatalogServices } from '../services/service-catalog';

/**
 * Filters services based on a search query.
 *
 * If query is empty or whitespace, returns baseServices unmodified.
 * If query is non-empty, searches across the unified pool of baseServices and catalogServices.
 *
 * @param query - Search query string
 * @param baseServices - Array of currently loaded services (favorites + recents)
 * @param catalogServices - Optional catalog services to expand search pool
 * @returns Filtered array of services matching the query
 */
export function searchServices(
  query: string,
  baseServices: Service[],
  catalogServices?: Service[]
): Service[] {
  if (!query || query.trim() === '') {
    return baseServices;
  }

  const pool = catalogServices ? getUnifiedSearchPool(baseServices, catalogServices) : baseServices;

  const lowerQuery = query.toLowerCase().trim();
  return pool.filter(
    (service) =>
      service.name.toLowerCase().includes(lowerQuery) ||
      service.id.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Ensures all user favorite IDs exist in the base services list,
 * synthesizing any missing favorites from the baseline catalog.
 *
 * @param baseServices - Currently loaded services
 * @param favoriteIds - Array of favorited service IDs
 * @param catalogServices - Baseline catalog services
 * @returns Array containing all base services plus any synthesized favorites
 */
export function ensureFavoritesInList(
  baseServices: Service[],
  favoriteIds: string[],
  catalogServices?: Service[]
): Service[] {
  const existingMap = new Map(baseServices.map((s) => [s.id.toLowerCase(), s]));
  const pool = catalogServices || getCatalogServices();
  const catalogMap = new Map(pool.map((s) => [s.id.toLowerCase(), s]));
  const result = [...baseServices];

  for (const favId of favoriteIds) {
    const lowerId = favId.toLowerCase();
    if (!existingMap.has(lowerId)) {
      const catalogItem = catalogMap.get(lowerId);
      if (catalogItem) {
        const synthesized: Service = { ...catalogItem, source: 'user' };
        result.push(synthesized);
        existingMap.set(lowerId, synthesized);
      }
    }
  }

  return result;
}
