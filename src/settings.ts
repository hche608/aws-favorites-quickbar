/**
 * Settings management for the content script
 *
 * Handles loading settings from storage with explicit first-launch vs returning-user paths,
 * and applying visual mode (theme) changes.
 */

import { storage as browserStorage } from './browser-api';
import { waitForElement } from './utils/dom';
import { VisualMode, STORAGE_DEFAULTS } from './types';

/**
 * Resolved settings after handling first-launch vs returning-user paths.
 */
export interface ResolvedSettings {
  favoriteIds: string[];
  maxServices: number;
  visualMode: VisualMode;
}

/**
 * Loads all settings from storage with explicit first-launch vs returning-user handling.
 *
 * If a value is undefined in storage (first launch for that key), the default is used
 * and written to storage so subsequent loads have a baseline.
 *
 * If a value exists in storage (returning user), it is used as-is — never overridden.
 */
export async function loadSettings(): Promise<ResolvedSettings> {
  const result = await browserStorage.sync.get(['userFavorites', 'maxServices', 'visualMode']);

  // User favorites
  let favoriteIds: string[];
  if (result.userFavorites === undefined) {
    favoriteIds = [...STORAGE_DEFAULTS.userFavorites];
    await browserStorage.sync.set({ userFavorites: favoriteIds });
  } else {
    favoriteIds = result.userFavorites as string[];
  }

  // Max services
  let maxServices: number;
  if (result.maxServices === undefined) {
    maxServices = STORAGE_DEFAULTS.maxServices;
    await browserStorage.sync.set({ maxServices });
  } else if (typeof result.maxServices === 'number') {
    maxServices = result.maxServices;
  } else {
    maxServices = STORAGE_DEFAULTS.maxServices;
    await browserStorage.sync.set({ maxServices });
  }

  // Visual mode
  let visualMode: VisualMode;
  if (result.visualMode === undefined) {
    visualMode = STORAGE_DEFAULTS.visualMode;
    await browserStorage.sync.set({ visualMode });
  } else if (result.visualMode === 'light' || result.visualMode === 'dark') {
    visualMode = result.visualMode as VisualMode;
  } else {
    visualMode = STORAGE_DEFAULTS.visualMode;
    await browserStorage.sync.set({ visualMode });
  }

  return { favoriteIds, maxServices, visualMode };
}

/**
 * Applies the visual mode (theme) on the AWS Console page.
 *
 * AWS Console has a radio group [data-testid="visualModeRadioGroup"] with
 * radio inputs for "default", "light", "dark". We wait for it to appear
 * (SPA may not have rendered it yet), then simulate a click on the matching
 * radio — AWS Console's own event handlers update the page.
 *
 * @param mode - The visual mode to apply ('light' or 'dark')
 */
export async function applyVisualMode(mode: VisualMode): Promise<void> {
  const radioGroup = await waitForElement(
    ['[data-testid="visualModeRadioGroup"]'],
    10000,
    'visualModeRadioGroup'
  );

  if (!radioGroup) {
    return;
  }

  const radio = radioGroup.querySelector(
    `input[type="radio"][value="${mode}"]`
  ) as HTMLInputElement | null;

  if (!radio) {
    return;
  }

  if (radio.checked) {
    return; // Already in the correct mode
  }

  radio.checked = true;
  radio.dispatchEvent(new Event('click', { bubbles: true }));
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}
