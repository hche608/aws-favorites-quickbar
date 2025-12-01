/**
 * Service merging functionality
 *
 * This module provides functionality to merge user-configured favorite services
 * with recently visited services, removing duplicates while preserving order.
 */

import { Service } from '../types';

/**
 * Merges user favorites and recently visited services
 *
 * This function combines two arrays of services, removing duplicates while:
 * - Preserving the order of user favorites
 * - Removing duplicates within user favorites (keeping first occurrence)
 * - Removing duplicates within recent services
 * - Excluding recent services that match user favorites
 * - Appending unique recent services after user favorites
 *
 * Service IDs are compared case-insensitively.
 *
 * @param userFavorites - User-configured favorite services
 * @param recentServices - Recently visited services
 * @returns Merged and deduplicated service array
 *
 * @example
 * const userFavs = [
 *   { id: 'ec2', name: 'EC2', iconUrl: '...', consoleUrl: '...' },
 *   { id: 's3', name: 'S3', iconUrl: '...', consoleUrl: '...' }
 * ];
 * const recent = [
 *   { id: 'ec2', name: 'EC2', iconUrl: '...', consoleUrl: '...' }, // duplicate
 *   { id: 'rds', name: 'RDS', iconUrl: '...', consoleUrl: '...' }
 * ];
 * const merged = mergeServices(userFavs, recent);
 * // Returns: [ec2, s3, rds] (ec2 from userFavs, not duplicated from recent)
 */
export function mergeServices(userFavorites: Service[], recentServices: Service[]): Service[] {
  // Deduplicate user favorites first (keep first occurrence)
  const seenUserIds = new Set<string>();
  const dedupedUserFavorites: Service[] = [];
  for (const service of userFavorites) {
    const lowerId = service.id.toLowerCase();
    if (!seenUserIds.has(lowerId)) {
      seenUserIds.add(lowerId);
      dedupedUserFavorites.push(service);
    }
  }

  // Filter recent services: remove duplicates within recent AND remove any that match user favorites
  const seenRecentIds = new Set<string>();
  const filteredRecentServices: Service[] = [];
  for (const service of recentServices) {
    const lowerId = service.id.toLowerCase();
    if (!seenUserIds.has(lowerId) && !seenRecentIds.has(lowerId)) {
      seenRecentIds.add(lowerId);
      filteredRecentServices.push(service);
    }
  }

  return [...dedupedUserFavorites, ...filteredRecentServices];
}
