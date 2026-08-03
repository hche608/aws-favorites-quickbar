/**
 * Popup storage utilities
 *
 * This module provides functions for managing user favorites, cached services,
 * max services configuration, and visual mode in browser storage.
 *
 * Storage pattern: explicit first-launch vs returning-user paths.
 * - If storage value is undefined: this is first launch for that key
 * - If storage value exists: use it as-is, never override with defaults
 */

import { Service, VisualMode, STORAGE_DEFAULTS } from '../types';
import { storage } from '../browser-api';

/**
 * Loads user favorites from sync storage.
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

/**
 * Saves user favorites to sync storage
 * @param favorites - Array of service IDs to save
 * @throws Error if storage write fails
 */
export async function saveUserFavorites(favorites: string[]): Promise<void> {
  await storage.sync.set({ userFavorites: favorites });
}

/**
 * Adds a service to user favorites
 * @param serviceId - Service ID to add
 * @returns Promise resolving to updated favorites array
 * @throws Error if storage operations fail
 */
export async function addFavorite(serviceId: string): Promise<string[]> {
  const stored = await loadUserFavorites();
  const favorites = stored === undefined ? [...STORAGE_DEFAULTS.userFavorites] : stored;

  const exists = favorites.some((id) => id.toLowerCase() === serviceId.toLowerCase());

  if (!exists) {
    favorites.push(serviceId);
    await saveUserFavorites(favorites);
  }

  return favorites;
}

/**
 * Removes a service from user favorites
 * @param serviceId - Service ID to remove
 * @returns Promise resolving to updated favorites array
 * @throws Error if storage operations fail
 */
export async function removeFavorite(serviceId: string): Promise<string[]> {
  const stored = await loadUserFavorites();
  const favorites = stored === undefined ? [...STORAGE_DEFAULTS.userFavorites] : stored;

  const updated = favorites.filter((id) => id.toLowerCase() !== serviceId.toLowerCase());

  await saveUserFavorites(updated);
  return updated;
}

/**
 * Loads cached services from local storage.
 *
 * Returns undefined if no cached services exist yet.
 * Returns the service map if cached data exists.
 *
 * @returns Promise resolving to map of service IDs to Service objects, or undefined if not cached
 * @throws Error if storage access fails
 */
export async function loadCachedServices(): Promise<Record<string, Service> | undefined> {
  const result = await storage.local.get(['cachedServices']);

  if (result.cachedServices === undefined) {
    return undefined;
  }

  const data = result.cachedServices;

  if (!data.services || !Array.isArray(data.services)) {
    return undefined;
  }

  const services: Service[] = data.services;
  const serviceMap: Record<string, Service> = {};

  for (const service of services) {
    serviceMap[service.id.toLowerCase()] = service;
  }

  return serviceMap;
}

/**
 * Loads maximum services configuration from sync storage.
 *
 * Returns undefined if not yet configured (first launch).
 * Returns the stored number if configured (returning user).
 *
 * @returns Promise resolving to max services value, or undefined if not yet initialized
 * @throws Error if storage access fails
 */
export async function loadMaxServices(): Promise<number | undefined> {
  const result = await storage.sync.get(['maxServices']);

  if (result.maxServices === undefined) {
    return undefined;
  }

  if (typeof result.maxServices !== 'number') {
    return undefined;
  }

  return result.maxServices;
}

/**
 * Saves maximum services configuration to sync storage
 * @param value - Maximum number of services to display
 * @throws Error if storage write fails
 */
export async function saveMaxServices(value: number): Promise<void> {
  await storage.sync.set({ maxServices: value });
}

/**
 * Loads visual mode preference from sync storage.
 *
 * Returns undefined if not yet configured (first launch).
 * Returns the stored mode if configured (returning user).
 *
 * @returns Promise resolving to visual mode, or undefined if not yet initialized
 * @throws Error if storage access fails
 */
export async function loadVisualMode(): Promise<VisualMode | undefined> {
  const result = await storage.sync.get(['visualMode']);

  if (result.visualMode === undefined) {
    return undefined;
  }

  const mode = result.visualMode as string;
  if (mode !== 'light' && mode !== 'dark') {
    return undefined;
  }

  return mode as VisualMode;
}

/**
 * Saves visual mode preference to sync storage
 * @param mode - Visual mode to save ('light' or 'dark')
 * @throws Error if storage write fails
 */
export async function saveVisualMode(mode: VisualMode): Promise<void> {
  await storage.sync.set({ visualMode: mode });
}
