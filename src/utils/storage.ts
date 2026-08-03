/**
 * Storage utilities for managing service data
 *
 * This module provides utilities for saving and loading services from both
 * localStorage and browser.storage APIs.
 *
 * Used by the content script for caching service data across page navigations.
 *
 * Storage pattern: explicit conditionals, no fallback logic.
 * - If data is absent: return undefined (caller decides what to do)
 * - If data is present: return it as-is
 */

import { Service } from '../types';
import { storage } from '../browser-api';

/**
 * Internal storage data structure with timestamp
 */
interface StorageDataWithTimestamp {
  services: Service[];
  timestamp: number;
}

/**
 * Saves services to both localStorage and browser.storage.local
 * @param services - Array of services to save
 * @throws Error if localStorage write fails
 */
export function saveServicesToStorage(services: Service[]): void {
  const data: StorageDataWithTimestamp = {
    services: services,
    timestamp: Date.now()
  };
  localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

  storage.local.set({ cachedServices: data }).catch((err: Error) => {
    console.error('AWS Favorites Quickbar: Error saving to browser.storage', err);
  });
}

/**
 * Loads services from localStorage.
 *
 * Returns undefined if no cached services exist (first visit or cleared storage).
 * Returns the service array if cached data exists.
 *
 * @returns Array of services, or undefined if no cached data exists
 * @throws Error if stored data is malformed JSON
 */
export function loadServicesFromStorage(): Service[] | undefined {
  const stored = localStorage.getItem('awsFavoritesQuickbar_services');

  if (stored === null) {
    return undefined;
  }

  const data = JSON.parse(stored) as StorageDataWithTimestamp;

  if (!data.services || !Array.isArray(data.services)) {
    return undefined;
  }

  return data.services;
}

/**
 * Loads user-configured favorites from browser.storage.sync.
 *
 * Returns undefined if no favorites have been saved yet (first launch).
 * Returns the stored array if favorites exist (returning user).
 *
 * @returns Promise resolving to array of service IDs, or undefined if not yet initialized
 * @throws Error if storage access fails
 */
export async function loadUserFavorites(): Promise<string[] | undefined> {
  const result = await storage.sync.get(['userFavorites']);

  if (result.userFavorites === undefined) {
    return undefined;
  }

  return result.userFavorites as string[];
}
