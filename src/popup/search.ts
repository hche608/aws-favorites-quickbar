/**
 * Search and filter services
 *
 * This module provides functionality for filtering services based on search queries.
 */

import { Service } from '../types';

/**
 * Filters services based on a search query
 * @param query - Search query string
 * @param allServices - Array of all available services
 * @returns Filtered array of services matching the query
 */
export function searchServices(query: string, allServices: Service[]): Service[] {
  if (!query || query.trim() === '') {
    return allServices;
  }

  const lowerQuery = query.toLowerCase().trim();
  return allServices.filter(
    (service) =>
      service.name.toLowerCase().includes(lowerQuery) ||
      service.id.toLowerCase().includes(lowerQuery)
  );
}
