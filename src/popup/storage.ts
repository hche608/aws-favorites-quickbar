/**
 * Popup storage utilities
 *
 * This module provides functions for managing user favorites and cached services
 * in browser storage (both sync and local storage).
 */

import { Service } from '../types';
import { storage } from '../browser-api';

/**
 * Loads user favorites from sync storage
 * @returns Promise resolving to array of service IDs
 * @throws Error if storage access fails
 */
export async function loadUserFavorites(): Promise<string[]> {
  try {
    const result = await storage.sync.get(['userFavorites']);
    return result.userFavorites || [];
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading favorites', error);
    throw error;
  }
}

/**
 * Saves user favorites to sync storage
 * @param favorites - Array of service IDs to save
 * @throws Error if storage write fails
 */
export async function saveUserFavorites(favorites: string[]): Promise<void> {
  try {
    await storage.sync.set({ userFavorites: favorites });
    console.log('AWS Favorites Quickbar: Favorites saved', favorites);
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving favorites', error);
    throw error;
  }
}

/**
 * Adds a service to user favorites
 * @param serviceId - Service ID to add
 * @returns Promise resolving to updated favorites array
 * @throws Error if storage operations fail
 */
export async function addFavorite(serviceId: string): Promise<string[]> {
  try {
    const favorites = await loadUserFavorites();

    const exists = favorites.some((id) => id.toLowerCase() === serviceId.toLowerCase());

    if (!exists) {
      favorites.push(serviceId);
      await saveUserFavorites(favorites);
    }

    return favorites;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error adding favorite', error);
    throw error;
  }
}

/**
 * Removes a service from user favorites
 * @param serviceId - Service ID to remove
 * @returns Promise resolving to updated favorites array
 * @throws Error if storage operations fail
 */
export async function removeFavorite(serviceId: string): Promise<string[]> {
  try {
    const favorites = await loadUserFavorites();

    const updated = favorites.filter((id) => id.toLowerCase() !== serviceId.toLowerCase());

    await saveUserFavorites(updated);
    return updated;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error removing favorite', error);
    throw error;
  }
}

/**
 * Loads cached services from local storage
 * @returns Promise resolving to map of service IDs to Service objects
 */
export async function loadCachedServices(): Promise<Record<string, Service>> {
  try {
    const result = await storage.local.get(['cachedServices']);

    if (!result.cachedServices) {
      console.log('AWS Favorites Quickbar: No cached services found');
      return {};
    }

    const data = result.cachedServices;
    const services: Service[] = data.services || [];

    const serviceMap: Record<string, Service> = {};
    services.forEach((service) => {
      serviceMap[service.id.toLowerCase()] = service;
    });

    console.log('AWS Favorites Quickbar: Loaded cached services:', Object.keys(serviceMap).length);
    return serviceMap;
  } catch (error) {
    console.warn('AWS Favorites Quickbar: Error loading cached services', error);
    return {};
  }
}

/**
 * Loads maximum services configuration from sync storage
 * @returns Promise resolving to maximum services value (defaults to 10)
 */
export async function loadMaxServices(): Promise<number> {
  try {
    const result = await storage.sync.get(['maxServices']);
    return result.maxServices || 10;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading maxServices', error);
    return 10;
  }
}

/**
 * Saves maximum services configuration to sync storage
 * @param value - Maximum number of services to display
 * @throws Error if storage write fails
 */
export async function saveMaxServices(value: number): Promise<void> {
  try {
    await storage.sync.set({ maxServices: value });
    console.log('AWS Favorites Quickbar: Saved maxServices:', value);
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving maxServices', error);
    throw error;
  }
}
