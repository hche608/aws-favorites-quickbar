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
  saveMaxServices
} from './popup/storage';
import { searchServices } from './popup/search';
import { showErrorState, updateEmptyState, showStorageWarning } from './popup/ui-state';
import { renderServiceList, isServiceSelected } from './popup/service-list-renderer';
import { createServiceClickHandler } from './popup/service-click-handler';
import { tabs } from './browser-api';
import { Service } from './types';

console.log('AWS Favorites Quickbar: Popup script loaded');

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

/**
 * Initializes the popup UI
 *
 * This function:
 * 1. Gets references to DOM elements
 * 2. Loads the max services setting
 * 3. Sets up event listeners
 * 4. Loads and renders the service list
 */
async function initializePopup(): Promise<void> {
  console.log('AWS Favorites Quickbar: Initializing popup');

  serviceListElement = document.getElementById('serviceList')!;
  searchInputElement = document.getElementById('searchInput') as HTMLInputElement;
  emptyStateElement = document.getElementById('emptyState')!;
  errorStateElement = document.getElementById('errorState')!;
  retryButtonElement = document.getElementById('retryButton')!;
  maxServicesInputElement = document.getElementById('maxServicesInput') as HTMLInputElement;

  await loadMaxServicesSetting();

  // Initialize service click handler with DOM element references
  handleServiceClick = createServiceClickHandler(
    (serviceId: string) => isServiceSelected(serviceId, currentFavorites),
    () => currentFavorites,
    (favorites: string[]) => {
      currentFavorites = favorites;
    },
    emptyStateElement,
    () => searchInputElement.value,
    () => renderServices() // Re-render when favorites change
  );

  setupEventListeners();
  await loadAndRenderServices();
}

/**
 * Loads the max services setting from storage and updates the input field
 */
async function loadMaxServicesSetting(): Promise<void> {
  try {
    const maxServices = await loadMaxServices();
    if (maxServicesInputElement) {
      maxServicesInputElement.value = maxServices.toString();
    }
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading maxServices setting', error);
  }
}

/**
 * Saves the max services setting to storage and notifies content scripts
 *
 * @param value - The maximum number of services to display
 */
async function saveMaxServicesSetting(value: number): Promise<void> {
  try {
    await saveMaxServices(value);

    // Notify all AWS Console tabs to update their quickbars
    const awsTabs = await tabs.query({ url: 'https://*.console.aws.amazon.com/*' });
    for (const tab of awsTabs) {
      if (tab.id) {
        tabs.sendMessage(tab.id, { action: 'updateQuickbar' }).catch(() => {
          // Ignore errors from tabs that don't have content script loaded
        });
      }
    }
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving maxServices setting', error);
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

  if (retryButtonElement) {
    retryButtonElement.addEventListener('click', loadAndRenderServices);
  }
}

/**
 * Loads services from storage and renders the service list
 *
 * This function:
 * 1. Loads cached services from storage
 * 2. Loads user favorites
 * 3. Handles errors and displays appropriate UI states
 * 4. Renders the service list
 */
async function loadAndRenderServices(): Promise<void> {
  try {
    showErrorState(errorStateElement, serviceListElement, false);

    const cachedServiceMap = await loadCachedServices();

    try {
      currentFavorites = await loadUserFavorites();
      console.log('AWS Favorites Quickbar: Loaded favorites', currentFavorites);
    } catch (error) {
      console.error('AWS Favorites Quickbar: Error loading favorites from storage', error);
      currentFavorites = [];
      showStorageWarning('Could not load your saved favorites. Using empty list.');
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
  } catch (error) {
    console.error('AWS Favorites Quickbar: Unexpected error loading services', error);
    showErrorState(
      errorStateElement,
      serviceListElement,
      true,
      'An unexpected error occurred. Please try again.'
    );
  }
}

/**
 * Renders the service list using the renderer module
 */
function renderServices(): void {
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
 * Handles search input changes
 *
 * Filters the service list based on the search query and re-renders
 *
 * @param event - The input event
 */
function handleSearch(event: Event): void {
  const target = event.target as HTMLInputElement;
  const query = target.value;
  filteredServices = searchServices(query, allServices);
  renderServices();
}

/**
 * Service click handler - will be initialized after DOM elements are ready
 */
let handleServiceClick: (event: Event, serviceId: string) => Promise<void>;

/**
 * Initialize the popup when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializePopup);
