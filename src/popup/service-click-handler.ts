/**
 * Service click handler for toggling favorite status
 *
 * Handles the logic for adding/removing services from favorites
 */

import { addFavorite, removeFavorite } from './storage';
import { showStorageWarning } from './ui-state';

/**
 * Creates a service click handler function
 *
 * @param isServiceSelected - Function to check if a service is selected
 * @param getCurrentFavorites - Function to get current favorites array
 * @param setCurrentFavorites - Function to update current favorites array
 * @param onFavoritesChanged - Callback to re-render the list after favorites change
 * @returns Handler function for service clicks
 */
export function createServiceClickHandler(
  isServiceSelected: (serviceId: string) => boolean,
  getCurrentFavorites: () => string[],
  setCurrentFavorites: (favorites: string[]) => void,
  onFavoritesChanged: () => void
): (event: Event, serviceId: string) => Promise<void> {
  return async function handleServiceClick(_event: Event, serviceId: string): Promise<void> {
    const isCurrentlySelected = isServiceSelected(serviceId);

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

      setTimeout(() => onFavoritesChanged(), 0);
    } catch (error) {
      console.error('AWS Favorites Quickbar: Error updating favorite', error);

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
          } else {
            await addFavorite(serviceId);
            currentFavorites.push(serviceId);
          }

          setCurrentFavorites(currentFavorites);
          setTimeout(() => onFavoritesChanged(), 0);
          console.log('AWS Favorites Quickbar: Retry successful');
        } catch (retryError) {
          console.error('AWS Favorites Quickbar: Retry failed', retryError);
          showStorageWarning('Storage operation failed. Your changes may not be saved.');
        }
      }, 1000);
    }
  };
}
