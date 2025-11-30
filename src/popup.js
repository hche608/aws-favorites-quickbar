// AWS Favorites Quickbar - Popup Main
// Coordinates all popup modules

import { loadUserFavorites, saveUserFavorites, addFavorite, removeFavorite, loadCachedServices, loadMaxServices, saveMaxServices } from './popup/storage.js';
import { searchServices } from './popup/search.js';
import { showErrorState, updateEmptyState, showStorageWarning } from './popup/ui-state.js';
import { createServiceItem } from './popup/service-item.js';
import { handleDragStart, handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave, createDropHandler } from './popup/drag-drop.js';

console.log('AWS Favorites Quickbar: Popup script loaded');

let allServices = [];
let currentFavorites = [];
let filteredServices = [];

let serviceListElement;
let searchInputElement;
let emptyStateElement;
let errorStateElement;
let retryButtonElement;
let maxServicesInputElement;

async function initializePopup() {
  console.log('AWS Favorites Quickbar: Initializing popup');
  
  serviceListElement = document.getElementById('serviceList');
  searchInputElement = document.getElementById('searchInput');
  emptyStateElement = document.getElementById('emptyState');
  errorStateElement = document.getElementById('errorState');
  retryButtonElement = document.getElementById('retryButton');
  maxServicesInputElement = document.getElementById('maxServicesInput');
  
  await loadMaxServicesSetting();
  setupEventListeners();
  await loadAndRenderServices();
}

async function loadMaxServicesSetting() {
  try {
    const maxServices = await loadMaxServices();
    if (maxServicesInputElement) {
      maxServicesInputElement.value = maxServices;
    }
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading maxServices setting', error);
  }
}

async function saveMaxServicesSetting(value) {
  try {
    await saveMaxServices(value);
    
    const tabs = await chrome.tabs.query({ url: 'https://*.console.aws.amazon.com/*' });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { action: 'updateQuickbar' }).catch(() => {});
    }
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving maxServices setting', error);
  }
}

function setupEventListeners() {
  searchInputElement.addEventListener('input', handleSearch);
  
  if (maxServicesInputElement) {
    maxServicesInputElement.addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 1 && value <= 50) {
        saveMaxServicesSetting(value);
      }
    });
  }
  
  if (retryButtonElement) {
    retryButtonElement.addEventListener('click', loadAndRenderServices);
  }
}

async function loadAndRenderServices() {
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
      renderServiceList();
      showStorageWarning('No services found. Visit the AWS Console homepage to populate the list.');
      return;
    }
    
    allServices = cachedServices;
    filteredServices = allServices;
    renderServiceList();
    
  } catch (error) {
    console.error('AWS Favorites Quickbar: Unexpected error loading services', error);
    showErrorState(errorStateElement, serviceListElement, true, 'An unexpected error occurred. Please try again.');
  }
}

function renderServiceList() {
  serviceListElement.innerHTML = '';
  
  if (filteredServices.length === 0) {
    if (searchInputElement.value.trim() !== '') {
      serviceListElement.innerHTML = '<div class="empty-state"><p>No services found matching your search.</p></div>';
    }
    return;
  }
  
  const favoriteServices = [];
  const nonFavoriteServices = [];
  
  filteredServices.forEach(service => {
    if (isServiceSelected(service.id)) {
      favoriteServices.push(service);
    } else {
      nonFavoriteServices.push(service);
    }
  });
  
  favoriteServices.sort((a, b) => {
    const indexA = currentFavorites.findIndex(id => id.toLowerCase() === a.id.toLowerCase());
    const indexB = currentFavorites.findIndex(id => id.toLowerCase() === b.id.toLowerCase());
    return indexA - indexB;
  });
  
  const dropHandler = createDropHandler(
    currentFavorites,
    saveUserFavorites,
    renderServiceList,
    showStorageWarning
  );
  
  const dragHandlers = {
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDrop: dropHandler,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onClick: handleServiceClick
  };
  
  favoriteServices.forEach(service => {
    const serviceItem = createServiceItem(service, true, true, dragHandlers);
    serviceListElement.appendChild(serviceItem);
  });
  
  const clickHandlers = {
    onClick: handleServiceClick
  };
  
  nonFavoriteServices.forEach(service => {
    const serviceItem = createServiceItem(service, false, false, clickHandlers);
    serviceListElement.appendChild(serviceItem);
  });
  
  updateEmptyState(emptyStateElement, currentFavorites, searchInputElement.value);
}

function isServiceSelected(serviceId) {
  return currentFavorites.some(id => 
    id.toLowerCase() === serviceId.toLowerCase()
  );
}

function handleSearch(event) {
  const query = event.target.value;
  filteredServices = searchServices(query, allServices);
  renderServiceList();
}

async function handleServiceClick(event, serviceId) {
  const isCurrentlySelected = isServiceSelected(serviceId);
  
  let item, checkbox;
  if (event.target.type === 'checkbox') {
    checkbox = event.target;
    item = checkbox.closest('.service-item');
  } else {
    item = event.currentTarget;
    checkbox = item.querySelector('input[type="checkbox"]');
  }
  
  try {
    if (isCurrentlySelected) {
      await removeFavorite(serviceId);
      currentFavorites = currentFavorites.filter(id => 
        id.toLowerCase() !== serviceId.toLowerCase()
      );
    } else {
      await addFavorite(serviceId);
      currentFavorites.push(serviceId);
    }
    
    console.log('AWS Favorites Quickbar: Updated favorites', currentFavorites);
    
    if (isCurrentlySelected) {
      item.classList.remove('selected');
      checkbox.checked = false;
    } else {
      item.classList.add('selected');
      checkbox.checked = true;
    }
    
    updateEmptyState(emptyStateElement, currentFavorites, searchInputElement.value);
    
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error updating favorite', error);
    
    if (isCurrentlySelected) {
      item.classList.add('selected');
      checkbox.checked = true;
    } else {
      item.classList.remove('selected');
      checkbox.checked = false;
    }
    
    showStorageWarning('Failed to save your selection. Please check your browser storage settings and try again.');
    
    setTimeout(async () => {
      try {
        if (isCurrentlySelected) {
          await removeFavorite(serviceId);
          currentFavorites = currentFavorites.filter(id => 
            id.toLowerCase() !== serviceId.toLowerCase()
          );
          item.classList.remove('selected');
          checkbox.checked = false;
        } else {
          await addFavorite(serviceId);
          currentFavorites.push(serviceId);
          item.classList.add('selected');
          checkbox.checked = true;
        }
        updateEmptyState(emptyStateElement, currentFavorites, searchInputElement.value);
        console.log('AWS Favorites Quickbar: Retry successful');
      } catch (retryError) {
        console.error('AWS Favorites Quickbar: Retry failed', retryError);
        showStorageWarning('Storage operation failed. Your changes may not be saved.');
      }
    }, 1000);
  }
}

document.addEventListener('DOMContentLoaded', initializePopup);
