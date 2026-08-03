/**
 * AWS Favorites Quickbar - Popup Main Entry Point
 *
 * This is the main entry point for the popup UI that allows users to manage their
 * favorite AWS services. It coordinates all popup modules including storage, search,
 * UI state management, service items, and drag-and-drop functionality.
 *
 * The popup displays a list of AWS services that users can select as favorites,
 * search through, and reorder via drag-and-drop.
 */

import {
  loadUserFavorites,
  loadCachedServices,
  loadMaxServices,
  saveMaxServices,
  loadVisualMode,
  saveVisualMode
} from './popup/storage';
import { searchServices } from './popup/search';
import { showErrorState, updateEmptyState, showStorageWarning } from './popup/ui-state';
import { renderServiceList, isServiceSelected } from './popup/service-list-renderer';
import { createServiceClickHandler } from './popup/service-click-handler';
import { tabs, storage } from './browser-api';
import { Service, VisualMode, STORAGE_DEFAULTS } from './types';

/**
 * All available services loaded from cache
 */
let allServices: Service[] = [];

/**
 * Current user-selected favorite service IDs
 */
let currentFavorites: string[] = [];

/**
 * Services filtered by current search query
 */
let filteredServices: Service[] = [];

/**
 * DOM element references
 */
let serviceListElement: HTMLElement;
let searchInputElement: HTMLInputElement;
let emptyStateElement: HTMLElement;
let errorStateElement: HTMLElement;
let retryButtonElement: HTMLElement;
let maxServicesInputElement: HTMLInputElement;
let visualModeSelectElement: HTMLSelectElement;
let pinningNoteElement: HTMLElement;

/**
 * Initializes the popup UI
 *
 * This function:
 * 1. Gets references to DOM elements
 * 2. Loads settings (maxServices, visualMode)
 * 3. Sets up event listeners
 * 4. Loads and renders the service list
 */
async function initializePopup(): Promise<void> {
  serviceListElement = document.getElementById('serviceList')!;
  searchInputElement = document.getElementById('searchInput') as HTMLInputElement;
  emptyStateElement = document.getElementById('emptyState')!;
  errorStateElement = document.getElementById('errorState')!;
  retryButtonElement = document.getElementById('retryButton')!;
  maxServicesInputElement = document.getElementById('maxServicesInput') as HTMLInputElement;
  visualModeSelectElement = document.getElementById('visualModeSelect') as HTMLSelectElement;
  pinningNoteElement = document.getElementById('pinningNote')!;

  await loadSettingsIntoUI();

  // Initialize service click handler with DOM element references
  handleServiceClick = createServiceClickHandler(
    (serviceId: string) => isServiceSelected(serviceId, currentFavorites),
    () => currentFavorites,
    (favorites: string[]) => {
      currentFavorites = favorites;
    },
    emptyStateElement,
    () => searchInputElement.value,
    () => renderServices()
  );

  setupEventListeners();
  await loadAndRenderServices();
}

/**
 * Loads settings from storage and populates UI elements.
 *
 * Uses explicit first-launch vs returning-user logic:
 * - If undefined: use default, display default in UI
 * - If stored value exists: use it, display it in UI
 */
async function loadSettingsIntoUI(): Promise<void> {
  // Max services
  const storedMax = await loadMaxServices();
  const maxServices = storedMax === undefined ? STORAGE_DEFAULTS.maxServices : storedMax;
  if (maxServicesInputElement) {
    maxServicesInputElement.value = maxServices.toString();
  }

  // Visual mode
  const storedMode = await loadVisualMode();
  const visualMode = storedMode === undefined ? STORAGE_DEFAULTS.visualMode : storedMode;
  if (visualModeSelectElement) {
    visualModeSelectElement.value = visualMode;
  }
}

/**
 * Saves the max services setting to storage and notifies content scripts
 *
 * @param value - The maximum number of services to display
 */
async function saveMaxServicesSetting(value: number): Promise<void> {
  await saveMaxServices(value);
  await notifyContentScripts();
}

/**
 * Saves the visual mode setting to storage and notifies content scripts
 *
 * @param mode - The visual mode to apply ('light' or 'dark')
 */
async function saveVisualModeSetting(mode: VisualMode): Promise<void> {
  await saveVisualMode(mode);
  await notifyContentScripts();
}

/**
 * Notifies all AWS Console tabs to update their quickbars
 */
async function notifyContentScripts(): Promise<void> {
  const awsTabs = await tabs.query({ url: 'https://*.console.aws.amazon.com/*' });
  for (const tab of awsTabs) {
    if (tab.id) {
      tabs.sendMessage(tab.id, { action: 'updateQuickbar' }).catch(() => {
        // Tab may not have content script loaded — this is expected
      });
    }
  }
}

/**
 * Sets up event listeners for the popup UI
 */
function setupEventListeners(): void {
  searchInputElement.addEventListener('input', handleSearch);

  if (maxServicesInputElement) {
    maxServicesInputElement.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      if (value >= 1 && value <= 50) {
        saveMaxServicesSetting(value);
      }
    });
  }

  if (visualModeSelectElement) {
    visualModeSelectElement.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const mode = target.value as VisualMode;
      if (mode === 'light' || mode === 'dark') {
        saveVisualModeSetting(mode);
      }
    });
  }

  if (retryButtonElement) {
    retryButtonElement.addEventListener('click', loadAndRenderServices);
  }
}

/**
 * Loads services from storage and renders the service list.
 *
 * Handles both first-launch (no cached services) and returning-user paths.
 */
async function loadAndRenderServices(): Promise<void> {
  showErrorState(errorStateElement, serviceListElement, false);

  const cachedServiceMap = await loadCachedServices();

  // Load user favorites
  const storedFavorites = await loadUserFavorites();
  if (storedFavorites === undefined) {
    // First launch — no favorites yet
    currentFavorites = [];
  } else {
    currentFavorites = storedFavorites;
  }

  // Handle cached services
  if (cachedServiceMap === undefined) {
    // No cached services — user hasn't visited AWS Console homepage yet
    allServices = [];
    filteredServices = [];
    renderServices();
    showStorageWarning('No services found. Visit the AWS Console homepage to populate the list.');
    return;
  }

  const cachedServices = Object.values(cachedServiceMap);

  if (cachedServices.length === 0) {
    allServices = [];
    filteredServices = [];
    renderServices();
    showStorageWarning('No services found. Visit the AWS Console homepage to populate the list.');
    return;
  }

  allServices = cachedServices;
  filteredServices = allServices;
  renderServices();
}

/**
 * Shows or hides the pinning note based on injection status from the content script.
 * Reads injectionStatus from storage — written by the content script on each page load.
 */
async function updatePinningNote(): Promise<void> {
  if (!pinningNoteElement) {
    return;
  }

  const result = await storage.local.get(['injectionStatus']);

  if (result.injectionStatus === 'success') {
    pinningNoteElement.style.display = 'none';
  } else {
    pinningNoteElement.style.display = 'block';
  }
}

/**
 * Renders the service list using the renderer module
 */
function renderServices(): void {
  updatePinningNote();
  renderServiceList(
    serviceListElement,
    filteredServices,
    currentFavorites,
    searchInputElement.value,
    handleServiceClick,
    () => {
      updateEmptyState(emptyStateElement, currentFavorites, searchInputElement.value);
    }
  );
}

/**
 * Handles search input changes.
 * Filters the service list based on the search query and re-renders.
 */
function handleSearch(event: Event): void {
  const target = event.target as HTMLInputElement;
  const query = target.value;
  filteredServices = searchServices(query, allServices);
  renderServices();
}

/**
 * Service click handler - initialized after DOM elements are ready
 */
let handleServiceClick: (event: Event, serviceId: string) => Promise<void>;

/**
 * Initialize the popup when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializePopup);
