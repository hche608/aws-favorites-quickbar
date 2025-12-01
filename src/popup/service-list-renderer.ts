/**
 * Service list rendering logic for the popup
 *
 * Handles rendering the list of services with favorites and non-favorites
 */

import { Service } from '../types';
import { createServiceItem } from './service-item';
import {
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  createDropHandler
} from './drag-drop';
import { saveUserFavorites } from './storage';
import { showStorageWarning } from './ui-state';

/**
 * Checks if a service is currently selected as a favorite
 *
 * @param serviceId - The service ID to check
 * @param currentFavorites - Array of current favorite IDs
 * @returns true if the service is in the favorites list
 */
export function isServiceSelected(serviceId: string, currentFavorites: string[]): boolean {
  return currentFavorites.some((id) => id.toLowerCase() === serviceId.toLowerCase());
}

/**
 * Renders the service list in the popup
 *
 * This function:
 * 1. Clears the current list
 * 2. Separates services into favorites and non-favorites
 * 3. Sorts favorites by user-specified order
 * 4. Creates service item elements with appropriate handlers
 *
 * @param serviceListElement - The DOM element to render into
 * @param filteredServices - Services to display (after search filtering)
 * @param currentFavorites - Array of current favorite IDs
 * @param searchQuery - Current search query
 * @param onServiceClick - Handler for service click events
 * @param onRenderComplete - Callback after rendering completes
 */
export function renderServiceList(
  serviceListElement: HTMLElement,
  filteredServices: Service[],
  currentFavorites: string[],
  searchQuery: string,
  onServiceClick: (event: Event, serviceId: string) => Promise<void>,
  onRenderComplete?: () => void
): void {
  serviceListElement.innerHTML = '';

  if (filteredServices.length === 0) {
    if (searchQuery.trim() !== '') {
      serviceListElement.innerHTML =
        '<div class="empty-state"><p>No services found matching your search.</p></div>';
    }
    return;
  }

  const favoriteServices: Service[] = [];
  const nonFavoriteServices: Service[] = [];

  filteredServices.forEach((service) => {
    if (isServiceSelected(service.id, currentFavorites)) {
      favoriteServices.push(service);
    } else {
      nonFavoriteServices.push(service);
    }
  });

  // Sort favorites by user-specified order
  favoriteServices.sort((a, b) => {
    const indexA = currentFavorites.findIndex((id) => id.toLowerCase() === a.id.toLowerCase());
    const indexB = currentFavorites.findIndex((id) => id.toLowerCase() === b.id.toLowerCase());
    return indexA - indexB;
  });

  // Create drop handler for drag-and-drop reordering
  const dropHandler = createDropHandler(
    currentFavorites,
    saveUserFavorites,
    () => {
      // Re-render after drop
      renderServiceList(
        serviceListElement,
        filteredServices,
        currentFavorites,
        searchQuery,
        onServiceClick,
        onRenderComplete
      );
    },
    showStorageWarning
  );

  // Handlers for favorite items (draggable)
  const dragHandlers = {
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDrop: dropHandler,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onClick: onServiceClick
  };

  // Render favorite services (draggable)
  favoriteServices.forEach((service) => {
    const serviceItem = createServiceItem(service, true, true, dragHandlers);
    serviceListElement.appendChild(serviceItem);
  });

  // Handlers for non-favorite items (not draggable)
  const clickHandlers = {
    onClick: onServiceClick
  };

  // Render non-favorite services
  nonFavoriteServices.forEach((service) => {
    const serviceItem = createServiceItem(service, false, false, clickHandlers);
    serviceListElement.appendChild(serviceItem);
  });

  if (onRenderComplete) {
    onRenderComplete();
  }
}
