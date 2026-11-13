/**
 * AWS Favorites Quickbar - Popup Main Entry Point
 */

import {
  loadUserFavorites,
  loadCachedServices,
  loadMaxServices,
  saveMaxServices,
  loadVisualMode,
  saveVisualMode,
  loadCodePipelineHoverPreference,
  saveCodePipelineHoverPreference,
  loadCodePipelineHoverDelay,
  saveCodePipelineHoverDelay
} from './popup/storage';
import { searchServices, ensureFavoritesInList } from './popup/search';
import { getCatalogServices } from './services/service-catalog';
import {
  showErrorState,
  updateEmptyState,
  showStorageWarning,
  setPopupTheme,
  updateFavoritesBadge,
  setupClearSearchButton
} from './popup/ui-state';
import { renderServiceList, isServiceSelected } from './popup/service-list-renderer';
import { createServiceClickHandler } from './popup/service-click-handler';
import { tabs, storage } from './browser-api';
import { Service, VisualMode, STORAGE_DEFAULTS } from './types';

let allServices: Service[] = [];
let currentFavorites: string[] = [];
let filteredServices: Service[] = [];

let serviceListElement: HTMLElement;
let searchInputElement: HTMLInputElement;
let emptyStateElement: HTMLElement;
let errorStateElement: HTMLElement;
let retryButtonElement: HTMLElement;
let maxServicesInputElement: HTMLInputElement;
let visualModeSelectElement: HTMLSelectElement;
let pinningNoteElement: HTMLElement;
let favoritesBadgeElement: HTMLElement | null;
let clearSearchBtnElement: HTMLElement | null;
let codePipelineHoverInputElement: HTMLInputElement | null;
let hoverDelaySelectElement: HTMLSelectElement | null;

/**
 * Initializes the popup UI
 */
async function initializePopup(): Promise<void> {
  serviceListElement = document.getElementById('serviceList')!;
  searchInputElement = document.getElementById('searchInput') as HTMLInputElement;
  emptyStateElement = document.getElementById('emptyState')!;
  errorStateElement = document.getElementById('errorState')!;
  retryButtonElement = document.getElementById('retryButton')!;
  maxServicesInputElement = document.getElementById('maxServicesInput') as HTMLInputElement;
  visualModeSelectElement = document.getElementById('visualModeSelect') as HTMLSelectElement;
  codePipelineHoverInputElement = document.getElementById(
    'codePipelineHoverInput'
  ) as HTMLInputElement | null;
  hoverDelaySelectElement = document.getElementById('hoverDelaySelect') as HTMLSelectElement | null;
  pinningNoteElement = document.getElementById('pinningNote')!;
  favoritesBadgeElement = document.getElementById('favoritesBadge');
  clearSearchBtnElement = document.getElementById('clearSearchBtn');

  setupClearSearchButton(searchInputElement, clearSearchBtnElement, () => {
    filteredServices = allServices;
    renderServices();
  });

  await loadSettingsIntoUI();

  handleServiceClick = createServiceClickHandler(
    (serviceId: string) => isServiceSelected(serviceId, currentFavorites),
    () => currentFavorites,
    (favorites: string[]) => {
      currentFavorites = favorites;
      allServices = ensureFavoritesInList(allServices, currentFavorites);
    },
    () => {
      renderServices();
      notifyContentScripts();
    }
  );

  setupEventListeners();
  await loadAndRenderServices();
}

/**
 * Loads settings from storage and populates UI elements.
 */
async function loadSettingsIntoUI(): Promise<void> {
  const storedMax = await loadMaxServices();
  const maxServices = storedMax === undefined ? STORAGE_DEFAULTS.maxServices : storedMax;
  if (maxServicesInputElement) {
    maxServicesInputElement.value = maxServices.toString();
  }

  const storedMode = await loadVisualMode();
  const visualMode = storedMode === undefined ? STORAGE_DEFAULTS.visualMode : storedMode;
  if (visualModeSelectElement) {
    visualModeSelectElement.value = visualMode;
  }
  setPopupTheme(visualMode);

  const storedHover = await loadCodePipelineHoverPreference();
  const hoverEnabled =
    storedHover === undefined ? STORAGE_DEFAULTS.enableCodePipelineHoverPreview : storedHover;
  if (codePipelineHoverInputElement) {
    codePipelineHoverInputElement.checked = hoverEnabled;
  }

  const storedDelay = await loadCodePipelineHoverDelay();
  const hoverDelay =
    storedDelay === undefined ? STORAGE_DEFAULTS.codePipelineHoverDelayMs : storedDelay;
  if (hoverDelaySelectElement) {
    hoverDelaySelectElement.value = hoverDelay.toString();
  }
}

async function saveMaxServicesSetting(value: number): Promise<void> {
  await saveMaxServices(value);
  await notifyContentScripts();
}

async function saveVisualModeSetting(mode: VisualMode): Promise<void> {
  setPopupTheme(mode);
  await saveVisualMode(mode);
  await notifyContentScripts();
}

async function notifyContentScripts(): Promise<void> {
  const awsTabs = await tabs.query({ url: 'https://*.console.aws.amazon.com/*' });
  for (const tab of awsTabs) {
    if (tab.id) {
      tabs.sendMessage(tab.id, { action: 'updateQuickbar' }).catch(() => {});
    }
  }
}

function setupEventListeners(): void {
  searchInputElement.addEventListener('input', handleSearch);

  if (maxServicesInputElement) {
    maxServicesInputElement.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      if (value >= 1 && value <= 50) {
        saveMaxServicesSetting(value);
        updateFavoritesBadge(favoritesBadgeElement, currentFavorites.length, value);
      }
    });
  }

  if (visualModeSelectElement) {
    visualModeSelectElement.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as VisualMode;
      if (mode === 'light' || mode === 'dark') {
        saveVisualModeSetting(mode);
      }
    });
  }

  if (codePipelineHoverInputElement) {
    codePipelineHoverInputElement.addEventListener('change', (e) => {
      saveCodePipelineHoverPreference((e.target as HTMLInputElement).checked);
    });
  }

  if (hoverDelaySelectElement) {
    hoverDelaySelectElement.addEventListener('change', (e) => {
      const delayMs = parseInt((e.target as HTMLSelectElement).value, 10);
      if (!isNaN(delayMs)) {
        saveCodePipelineHoverDelay(delayMs);
      }
    });
  }

  if (retryButtonElement) {
    retryButtonElement.addEventListener('click', loadAndRenderServices);
  }
}

async function loadAndRenderServices(): Promise<void> {
  showErrorState(errorStateElement, serviceListElement, false);
  const cachedServiceMap = await loadCachedServices();
  const storedFavorites = await loadUserFavorites();
  currentFavorites = storedFavorites === undefined ? [] : storedFavorites;

  if (cachedServiceMap === undefined) {
    allServices = ensureFavoritesInList([], currentFavorites);
    filteredServices = allServices;
    renderServices();
    if (allServices.length === 0) {
      showStorageWarning('No services found. Visit the AWS Console homepage to populate the list.');
    }
    return;
  }

  const cachedServices = Object.values(cachedServiceMap);
  allServices = ensureFavoritesInList(cachedServices, currentFavorites);
  filteredServices = allServices;
  renderServices();

  if (allServices.length === 0) {
    showStorageWarning('No services found. Visit the AWS Console homepage to populate the list.');
  }
}

async function updatePinningNote(): Promise<void> {
  if (!pinningNoteElement) return;
  const result = await storage.local.get(['injectionStatus']);
  pinningNoteElement.style.display = result.injectionStatus === 'success' ? 'none' : 'block';
}

function renderServices(): void {
  updatePinningNote();
  const maxLimit = parseInt(maxServicesInputElement?.value || '10', 10);
  updateFavoritesBadge(favoritesBadgeElement, currentFavorites.length, maxLimit);
  renderServiceList(
    serviceListElement,
    filteredServices,
    currentFavorites,
    searchInputElement.value,
    handleServiceClick,
    () => {
      updateEmptyState(emptyStateElement, currentFavorites, searchInputElement.value);
    },
    () => notifyContentScripts()
  );
}

function handleSearch(event: Event): void {
  const query = (event.target as HTMLInputElement).value;
  filteredServices = searchServices(query, allServices, getCatalogServices());
  renderServices();
}

let handleServiceClick: (event: Event, serviceId: string) => Promise<void>;

document.addEventListener('DOMContentLoaded', initializePopup);
