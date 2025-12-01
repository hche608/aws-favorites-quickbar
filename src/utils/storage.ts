/**
 * Storage utilities for managing service data
 *
 * This module provides utilities for saving and loading services from both
 * localStorage and browser.storage APIs.
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
 */
export function saveServicesToStorage(services: Service[]): void {
  try {
    const data: StorageDataWithTimestamp = {
      services: services,
      timestamp: Date.now()
    };
    localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));

    storage.local.set({ cachedServices: data }).catch((err: Error) => {
      console.warn('AWS Favorites Quickbar: Error saving to browser.storage', err);
    });
  } catch (error) {
    console.warn('AWS Favorites Quickbar: Error saving to localStorage', error);
  }
}

/**
 * Loads services from localStorage
 * @returns Array of services, or empty array if none found or error occurs
 */
export function loadServicesFromStorage(): Service[] {
  try {
    const stored = localStorage.getItem('awsFavoritesQuickbar_services');
    if (!stored) {
      return [];
    }

    const data = JSON.parse(stored) as StorageDataWithTimestamp;
    return data.services || [];
  } catch (_error) {
    return [];
  }
}

/**
 * Loads user-configured favorites from browser.storage.sync
 * @returns Promise resolving to array of service IDs, or empty array if none found or error occurs
 */
export async function loadUserFavorites(): Promise<string[]> {
  try {
    const result = await storage.sync.get(['userFavorites']);
    return result.userFavorites || [];
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading favorites', error);
    return [];
  }
}
