/**
 * Global namespace setup for integration tests
 *
 * This module sets up the window.AWSFavoritesQuickbar global namespace
 * that integration tests expect. It imports TypeScript modules and
 * exposes their functions on the global object.
 */

import { mergeServices } from '../../src/services/service-merger';
import {
  parseRecentlyVisited,
  waitForRecentlyVisitedWidget
} from '../../src/services/recently-visited-parser';
import { createServiceLink } from '../../src/quickbar/dom-builder';
import { injectServices } from '../../src/quickbar/injector';
import { loadUserFavorites, saveServicesToStorage } from '../../src/utils/storage';

/**
 * Sets up the global AWSFavoritesQuickbar namespace
 * This mimics the behavior of the original JavaScript version
 */
export function setupGlobalNamespace(): void {
  // Initialize the global namespace
  (window as any).AWSFavoritesQuickbar = (window as any).AWSFavoritesQuickbar || {};

  // Expose service merger functions
  (window as any).AWSFavoritesQuickbar.mergeServices = mergeServices;

  // Expose recently visited parser functions
  (window as any).AWSFavoritesQuickbar.parseRecentlyVisited = parseRecentlyVisited;
  (window as any).AWSFavoritesQuickbar.waitForRecentlyVisitedWidget = waitForRecentlyVisitedWidget;

  // Expose quickbar functions
  (window as any).AWSFavoritesQuickbar.createServiceLink = createServiceLink;
  (window as any).AWSFavoritesQuickbar.injectServices = injectServices;

  // Expose storage functions
  (window as any).AWSFavoritesQuickbar.loadUserFavorites = loadUserFavorites;
  (window as any).AWSFavoritesQuickbar.saveServicesToStorage = saveServicesToStorage;
}

/**
 * Clears the global AWSFavoritesQuickbar namespace
 */
export function clearGlobalNamespace(): void {
  delete (window as any).AWSFavoritesQuickbar;
}
