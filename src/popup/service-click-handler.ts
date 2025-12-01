/**
 * Service click handler for toggling favorite status
 *
 * Handles the logic for adding/removing services from favorites
 */

import { addFavorite, removeFavorite } from './storage';
import { showStorageWarning, updateEmptyState } from './ui-state';

/**
 * Creates a service click handler function
 *
 * @param isServiceSelected - Function to check if a service is selected
 * @param getCurrentFavorites - Function to get current favorites array
 * @param setCurrentFavorites - Function to update current favorites array
 * @param emptyStateElement - DOM element for empty state
 * @param searchQuery - Current search query
 * @param onFavoritesChanged - Callback to re-render the list after favorites change
 * @returns Handler function for service clicks
 */
export function createServiceClickHandler(
  isServiceSelected: (serviceId: string) => boolean,
  getCurrentFavorites: () => string[],
  setCurrentFavorites: (favorites: string[]) => void,
  emptyStateElement: HTMLElement,
  searchQuery: () => string,
  onFavoritesChanged?: () => void
): (event: Event, serviceId: string) => Promise<void> {
  /**
   * Handles service item click events to toggle favorite status
   *
   * This function:
   * 1. Determines if the service is currently selected
   * 2. Updates storage (add or remove favorite)
   * 3. Updates the UI immediately
   * 4. Handles errors with retry logic
   *
   * @param event - The click event
   * @param serviceId - The ID of the service that was clicked
   */
  return async function handleServiceClick(event: Event, serviceId: string): Promise<void> {
    const isCurrentlySelected = isServiceSelected(serviceId);

    let item: HTMLElement;
    let checkbox: HTMLInputElement;

    const target = event.target as HTMLElement;
    if ((target as HTMLInputElement).type === 'checkbox') {
      checkbox = target as HTMLInputElement;
      item = checkbox.closest('.service-item') as HTMLElement;
    } else {
      item = event.currentTarget as HTMLElement;
      checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
    }

    try {
      let currentFavorites = getCurrentFavorites();

      if (isCurrentlySelected) {
        await removeFavorite(serviceId);
        currentFavorites = currentFavorites.filter(
          (id) => id.toLowerCase() !== serviceId.toLowerCase()
        );
      } else {
        await addFavorite(serviceId);
        currentFavorites.push(serviceId);
      }

      setCurrentFavorites(currentFavorites);
      console.log('AWS Favorites Quickbar: Updated favorites', currentFavorites);

      // Re-render the list to update drag handlers
      // Use setTimeout to ensure the state update completes before re-rendering
      if (onFavoritesChanged) {
        setTimeout(() => onFavoritesChanged(), 0);
      } else {
        // Fallback: Update UI immediately if no re-render callback
        if (isCurrentlySelected) {
          item.classList.remove('selected');
          checkbox.checked = false;
        } else {
          item.classList.add('selected');
          checkbox.checked = true;
        }

        updateEmptyState(emptyStateElement, currentFavorites, searchQuery());
      }
    } catch (error) {
      console.error('AWS Favorites Quickbar: Error updating favorite', error);

      // Revert UI on error
      if (isCurrentlySelected) {
        item.classList.add('selected');
        checkbox.checked = true;
      } else {
        item.classList.remove('selected');
        checkbox.checked = false;
      }

      showStorageWarning(
        'Failed to save your selection. Please check your browser storage settings and try again.'
      );

      // Retry after a delay
      setTimeout(async () => {
        try {
          let currentFavorites = getCurrentFavorites();

          if (isCurrentlySelected) {
            await removeFavorite(serviceId);
            currentFavorites = currentFavorites.filter(
              (id) => id.toLowerCase() !== serviceId.toLowerCase()
            );
            item.classList.remove('selected');
            checkbox.checked = false;
          } else {
            await addFavorite(serviceId);
            currentFavorites.push(serviceId);
            item.classList.add('selected');
            checkbox.checked = true;
          }

          setCurrentFavorites(currentFavorites);

          // Re-render after retry
          if (onFavoritesChanged) {
            setTimeout(() => onFavoritesChanged(), 0);
          } else {
            updateEmptyState(emptyStateElement, currentFavorites, searchQuery());
          }

          console.log('AWS Favorites Quickbar: Retry successful');
        } catch (retryError) {
          console.error('AWS Favorites Quickbar: Retry failed', retryError);
          showStorageWarning('Storage operation failed. Your changes may not be saved.');
        }
      }, 1000);
    }
  };
}
